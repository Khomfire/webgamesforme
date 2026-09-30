// เสียงแบบตู้เกม สร้างด้วย Web Audio ไม่ต้องโหลดไฟล์เสียง
// ปุ่มเลือกเสียงได้ด้วย data-sfx="ชื่อเสียง" ถ้าไม่ใส่จะเป็นเสียง click ใส่ "none" ไม่มีเสียง
// แต่ละเสียงคือลำดับโน้ต [ความถี่เริ่ม, ความถี่จบ, ความยาววินาที]
const SOUNDS = {
  click: [[880, 440, 0.08]],
  create: [[523, 523, 0.07], [659, 659, 0.07], [784, 784, 0.12]],
  join: [[659, 659, 0.07], [988, 988, 0.12]],
  start: [[392, 392, 0.08], [523, 523, 0.08], [659, 659, 0.08], [1047, 1047, 0.2]],
  next: [[523, 523, 0.06], [784, 784, 0.1]],
  vote: [[220, 110, 0.14]],
  confirm: [[1175, 1175, 0.06], [1568, 1568, 0.1]],
  roll: [[180, 120, 0.04], [260, 160, 0.04], [200, 140, 0.04], [300, 180, 0.05], [220, 150, 0.05]],
  win: [[523, 523, 0.12], [659, 659, 0.12], [784, 784, 0.12], [1047, 1047, 0.12], [784, 784, 0.1], [1047, 1047, 0.4]],
  none: [],
};

let audio;
function playSfx(name) {
  if (name === "place") return playPlace();
  if (name === "capture") return playCapture();
  audio ??= new AudioContext();
  let t = audio.currentTime;
  for (const [from, to, length] of SOUNDS[name] || SOUNDS.click) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length);
    t += length;
  }
}

document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest("button:not(:disabled), a");
  if (el) playSfx(el.dataset.sfx);
});

// เสียงระเบิดของพลุ: เสียงซ่า (noise) ที่ตัดเสียงแหลมออกแล้วค่อยๆ เบาลง
function playBoom() {
  audio ??= new AudioContext();
  const t = audio.currentTime;
  const length = 0.6;
  const buffer = audio.createBuffer(1, audio.sampleRate * length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200 + Math.random() * 800, t);
  filter.frequency.exponentialRampToValueAtTime(200, t + length);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + length);
  noise.connect(filter).connect(gain).connect(audio.destination);
  noise.start(t);
}

// เสียงวางหมากลงกระดาน ("place"): เสียงไม้กระทบกันสั้นๆ (noise ผ่าน bandpass) กับเสียงทุ้มของตัวกระดาน
function playPlace() {
  audio ??= new AudioContext();
  const t = audio.currentTime;
  const length = 0.05;
  const buffer = audio.createBuffer(1, audio.sampleRate * length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 4;
  const knock = audio.createBufferSource();
  knock.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800 + Math.random() * 400;
  filter.Q.value = 1.5;
  const knockGain = audio.createGain();
  knockGain.gain.value = 0.35;
  knock.connect(filter).connect(knockGain).connect(audio.destination);
  knock.start(t);
  const body = audio.createOscillator();
  body.frequency.setValueAtTime(240, t);
  body.frequency.exponentialRampToValueAtTime(120, t + 0.1);
  const bodyGain = audio.createGain();
  bodyGain.gain.setValueAtTime(0.1, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  body.connect(bodyGain).connect(audio.destination);
  body.start(t);
  body.stop(t + 0.1);
}

// เสียงกินหมาก ("capture"): หมากกระทบกัน ตามด้วยเสียงแตกกรอบ (noise ผ่าน highpass) กับเสียงตู้เกมดิ่งลง
function playCapture() {
  playPlace();
  const t = audio.currentTime + 0.03;
  const length = 0.12;
  const buffer = audio.createBuffer(1, audio.sampleRate * length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const crack = audio.createBufferSource();
  crack.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const crackGain = audio.createGain();
  crackGain.gain.value = 0.3;
  crack.connect(filter).connect(crackGain).connect(audio.destination);
  crack.start(t);
  const zap = audio.createOscillator();
  zap.type = "square";
  zap.frequency.setValueAtTime(1100, t);
  zap.frequency.exponentialRampToValueAtTime(140, t + 0.16);
  const zapGain = audio.createGain();
  zapGain.gain.setValueAtTime(0.06, t);
  zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  zap.connect(zapGain).connect(audio.destination);
  zap.start(t);
  zap.stop(t + 0.16);
}
