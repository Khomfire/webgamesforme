// พลุแบบพิกเซลตอนมีคนชนะ วาดบน <canvas id="fireworks"> ใน popup ผู้ชนะ ยิงอยู่ 4 วินาที
// ต้องโหลด sfx.js ก่อน เพราะใช้ playBoom()
function fireworks() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.getElementById("fireworks");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const colors = ["#ffd23f", "#ff4d4d", "#3ee0e0", "#ff5ec8", "#f4f4f4"];
  let sparks = [];
  const stop = performance.now() + 4000;
  let nextBurst = 0;
  function burst() {
    playBoom();
    const x = canvas.width * (0.15 + Math.random() * 0.7);
    const y = canvas.height * (0.1 + Math.random() * 0.4);
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2, speed = 2 + Math.random() * 3;
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 60 + Math.random() * 30, color });
    }
  }
  function frame(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (t < stop && t >= nextBurst) { burst(); nextBurst = t + 350 + Math.random() * 300; }
    sparks = sparks.filter((p) => --p.life > 0);
    for (const p of sparks) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.98;
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, 4, 4);
    }
    if (sparks.length || t < stop) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
