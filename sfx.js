// เสียงทั้งหมดสร้างด้วย Web Audio ไม่ต้องโหลดไฟล์เสียง
// เสียงแบบตู้เกม (SOUNDS) ใช้กับปุ่มเท่านั้น สิ่งที่เกิดในเกมใช้เสียงสมจริง (REAL) เช่นวางหมาก จั่วไพ่ ทอยเต๋า
// ปุ่มเลือกเสียงได้ด้วย data-sfx="ชื่อเสียง" ถ้าไม่ใส่จะเป็นเสียง click ใส่ "none" ไม่มีเสียง
// แต่ละเสียงแบบตู้เกมคือลำดับโน้ต [ความถี่เริ่ม, ความถี่จบ, ความยาววินาที]
const SOUNDS = {
  click: [[880, 440, 0.08]],
  create: [[523, 523, 0.07], [659, 659, 0.07], [784, 784, 0.12]],
  join: [[659, 659, 0.07], [988, 988, 0.12]],
  start: [[392, 392, 0.08], [523, 523, 0.08], [659, 659, 0.08], [1047, 1047, 0.2]],
  next: [[523, 523, 0.06], [784, 784, 0.1]],
  vote: [[220, 110, 0.14]],
  confirm: [[1175, 1175, 0.06], [1568, 1568, 0.1]],
  none: [],
};

let audio;
function playSfx(name) {
  audio ??= new AudioContext();
  if (REAL[name]) return REAL[name](audio.currentTime);
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

// ---------- เสียงสมจริง ----------
// ส่วนใหญ่คือ noise สั้นๆ ที่กรองความถี่ (เสียงกระทบ ขูด ซ่า) ผสมเสียงก้องของวัตถุ (oscillator)
// hit: noise ยาว length วินาที ดังขึ้นช่วง attack (สัดส่วนของความยาว) แล้วเบาลงตาม curve (ยิ่งมากยิ่งหายเร็ว)
function hit(t, { length, type = "bandpass", freq, q = 1, gain, curve = 4, attack = 0 }) {
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * length), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const x = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (x < attack ? x / attack : (1 - (x - attack) / (1 - attack)) ** curve);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const amp = audio.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(audio.destination);
  src.start(t);
}
// ring: เสียงก้องสั้นๆ ความถี่เลื่อนจาก from ไป to
function ring(t, from, to, length, gain) {
  const osc = audio.createOscillator();
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  const amp = audio.createGain();
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.001, t + length);
  osc.connect(amp).connect(audio.destination);
  osc.start(t);
  osc.stop(t + length);
}
const REAL = {
  place: () => playPlace(),
  // กินหมาก: หมากสองตัวกระทบกันดังแป๊ก แล้วหมากที่กินวางลงกระดาน
  capture: (t) => {
    hit(t, { length: 0.03, freq: 2600, q: 2.5, gain: 0.45 });
    ring(t, 1400, 1100, 0.04, 0.05);
    setTimeout(playPlace, 70);
  },
  // เม็ดหมากโกะวางบนกระดานไม้: เสียงแหลมคม กับเสียงทุ้มของกระดาน
  stone: (t) => {
    hit(t, { length: 0.03, freq: 3500, q: 2, gain: 0.5 });
    ring(t, 1200, 900, 0.06, 0.06);
    ring(t, 220, 160, 0.08, 0.12);
  },
  // ไพ่ไถลบนโต๊ะแล้วหยุด
  card: (t) => {
    hit(t, { length: 0.12, freq: 2500, q: 0.6, gain: 0.2, curve: 1.5, attack: 0.5 });
    hit(t + 0.1, { length: 0.03, type: "highpass", freq: 3000, gain: 0.2, curve: 3 });
  },
  // พลิกไพ่ หรือของแตกดังแป๊ะ
  snap: (t) => {
    hit(t, { length: 0.025, type: "highpass", freq: 2000, gain: 0.22, curve: 3 });
    hit(t + 0.015, { length: 0.04, freq: 900, gain: 0.15, curve: 3 });
  },
  // ตบไพ่ลงโต๊ะแรงๆ
  slap: (t) => {
    hit(t, { length: 0.08, freq: 1800, q: 0.7, gain: 0.5, curve: 3 });
    ring(t, 160, 70, 0.1, 0.25);
  },
  // ชิป เหรียญ หรือหมากเล็กๆ กระทบกันหลายที
  chips: (t) => {
    for (let j = 0, at = t; j < 3 + Math.floor(Math.random() * 3); j++, at += 0.025 + Math.random() * 0.04) {
      hit(at, { length: 0.015, freq: 4000 + Math.random() * 1500, q: 3, gain: 0.35, curve: 2 });
      ring(at, 5200 + Math.random() * 800, 5000, 0.03, 0.03);
    }
  },
  // ทอยเต๋า: เต๋ากระทบโต๊ะถี่ๆ แล้วห่างขึ้นและเบาลงจนหยุด (ราว 0.6 วินาที)
  dice: (t) => {
    for (let j = 0, at = t, gap = 0.03; j < 10; j++, at += gap, gap *= 1.15) {
      const amp = 1 - j / 12;
      hit(at, { length: 0.02, freq: 2200 + Math.random() * 1500, q: 2, gain: 0.45 * amp, curve: 3 });
      ring(at, 500 + Math.random() * 300, 450, 0.04, 0.06 * amp);
    }
  },
  // ขีดเส้นด้วยดินสอบนกระดาษ
  pen: (t) => {
    hit(t, { length: 0.18, freq: 5000, q: 0.8, gain: 0.14, curve: 1, attack: 0.3 });
    hit(t, { length: 0.18, freq: 2500, q: 1, gain: 0.06, curve: 1, attack: 0.3 });
  },
  // เคาะโต๊ะสองที (เช็ค ผ่าน)
  knock: (t) => {
    for (const at of [t, t + 0.12]) {
      hit(at, { length: 0.05, type: "lowpass", freq: 800, gain: 0.5 });
      ring(at, 180, 90, 0.08, 0.3);
    }
  },
  // ลากของหนักๆ บนโต๊ะ เช่นจั่วโดมิโน ยกถ้วยเต๋า
  slide: (t) => {
    hit(t, { length: 0.2, type: "lowpass", freq: 1200, gain: 0.3, curve: 1, attack: 0.4 });
    hit(t + 0.18, { length: 0.04, type: "lowpass", freq: 900, gain: 0.3 });
  },
};
