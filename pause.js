// ปุ่มหยุดเกม (มุมขวาบน ข้างปุ่ม ?) ใครในห้องก็กดหยุดหรือเล่นต่อได้
// ระหว่างหยุด server ไม่รับคำสั่งอื่นและเวลาของตาหยุดนับ ทุกเครื่องขึ้น popup จนมีคนกดเล่นต่อ
// หน้าเกมเรียก pauseUi(view, send) ทุกครั้งที่วาดใหม่
const pauseStyle = document.createElement("style");
pauseStyle.textContent = `
  .top .pause-btn { --c: var(--cyan); position: relative; margin: 0 16px 0 auto; }
  .top .pause-btn[hidden] { display: none; }
  .pause-btn::before, .pause-btn::after { content: ""; position: absolute; top: 11px; width: 5px; height: 16px; background: currentColor; }
  .pause-btn::before { left: 12px; }
  .pause-btn::after { right: 12px; }
  #paused { text-align: center; }
  #paused h2 { margin: 8px 0 4px; color: var(--yellow); }
`;
document.head.append(pauseStyle);

const pauseBtn = document.createElement("button");
pauseBtn.className = "icon-btn pause-btn";
pauseBtn.hidden = true;
pauseBtn.setAttribute("aria-label", "หยุดเกม");
document.getElementById("rules-open").before(pauseBtn);

const pauseDialog = document.createElement("dialog");
pauseDialog.id = "paused";
pauseDialog.setAttribute("aria-labelledby", "paused-title");
pauseDialog.innerHTML = `<h2 id="paused-title">หยุดเกม</h2><p class="hint" id="paused-by"></p><button id="resume" data-sfx="start">เล่นต่อ</button>`;
document.body.append(pauseDialog);
pauseDialog.addEventListener("cancel", (e) => e.preventDefault()); // ปิดด้วย Esc ไม่ได้ ต้องกดเล่นต่อ

function pauseUi(v, send) {
  const inGame = v.screen !== "home" && v.screen !== "lobby"; // หน้าแรกยังเก็บสถานะห้องเก่าไว้ ไม่นับ
  const paused = inGame && v.paused;
  pauseBtn.hidden = !inGame || v.screen === "over" || !!paused;
  pauseBtn.onclick = () => send({ t: "pause" });
  pauseDialog.querySelector("#resume").onclick = () => send({ t: "resume" });
  if (paused) {
    pauseDialog.querySelector("#paused-by").textContent = "โดย " + paused;
    if (!pauseDialog.open) pauseDialog.showModal();
  } else if (pauseDialog.open) pauseDialog.close();
}
