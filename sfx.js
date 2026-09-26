// เสียงบี๊ปแบบตู้เกมตอนกดปุ่มหรือลิงก์ สร้างด้วย Web Audio ไม่ต้องโหลดไฟล์เสียง
let audio;
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("button:not(:disabled), a")) return;
  audio ??= new AudioContext();
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.1);
});
