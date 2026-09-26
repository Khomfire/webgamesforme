// เสียงแบบตู้เกม สร้างด้วย Web Audio ไม่ต้องโหลดไฟล์เสียง
// ปุ่มเลือกเสียงได้ด้วย data-sfx="ชื่อเสียง" ถ้าไม่ใส่จะเป็นเสียง click
// แต่ละเสียงคือลำดับโน้ต [ความถี่เริ่ม, ความถี่จบ, ความยาววินาที]
const SOUNDS = {
  click: [[880, 440, 0.08]],
  create: [[523, 523, 0.07], [659, 659, 0.07], [784, 784, 0.12]],
  join: [[659, 659, 0.07], [988, 988, 0.12]],
  start: [[392, 392, 0.08], [523, 523, 0.08], [659, 659, 0.08], [1047, 1047, 0.2]],
  next: [[523, 523, 0.06], [784, 784, 0.1]],
  vote: [[220, 110, 0.14]],
  confirm: [[1175, 1175, 0.06], [1568, 1568, 0.1]],
  win: [[523, 523, 0.12], [659, 659, 0.12], [784, 784, 0.12], [1047, 1047, 0.12], [784, 784, 0.1], [1047, 1047, 0.4]],
};

let audio;
function playSfx(name) {
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
