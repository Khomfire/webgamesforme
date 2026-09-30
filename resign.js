// ปุ่มยอมแพ้ (มุมขวาบน ซ้ายของปุ่มหยุดเกม) กดแล้วขึ้น popup ให้ยืนยันก่อนส่ง
// แสดงเฉพาะตอนที่ server บอกว่ายอมแพ้ได้ (view.canResign)
// หน้าเกมใส่ไฟล์นี้หลัง pause.js แล้วเรียก resignUi(view, send) ทุกครั้งที่วาดใหม่
const resignStyle = document.createElement("style");
resignStyle.textContent = `
  .top .resign-btn { --c: var(--red); position: relative; margin: 0 1rem 0 auto; }
  .top .resign-btn[hidden] { display: none; }
  .top .resign-btn:not([hidden]) + .pause-btn { margin-left: 0; }
  /* ธงขาว: เสาหนึ่งเส้นกับผืนธง */
  .resign-btn::before { content: ""; position: absolute; left: 0.75rem; top: 0.5rem; width: 0.1875rem; height: 1.5rem; background: currentColor; }
  .resign-btn::after { content: ""; position: absolute; left: 0.9375rem; top: 0.5rem; width: 0.875rem; height: 0.625rem; background: currentColor; }
  #resign-yes { --c: var(--red); }
`;
document.head.append(resignStyle);

const resignBtn = document.createElement("button");
resignBtn.className = "icon-btn resign-btn";
resignBtn.hidden = true;
resignBtn.dataset.sfx = "vote";
resignBtn.setAttribute("aria-label", "ยอมแพ้");
document.querySelector(".pause-btn").before(resignBtn);

const resignDialog = document.createElement("dialog");
resignDialog.id = "resign-ask";
resignDialog.setAttribute("aria-labelledby", "resign-title");
resignDialog.innerHTML = `
  <div class="dialog-top">
    <h2 id="resign-title">ยอมแพ้?</h2>
    <button class="icon-btn" id="resign-close" aria-label="ยกเลิก">&times;</button>
  </div>
  <button id="resign-yes" data-sfx="vote">ยอมแพ้</button>`;
document.body.append(resignDialog);
resignBtn.onclick = () => resignDialog.showModal();
resignDialog.querySelector("#resign-close").onclick = () => resignDialog.close();

function resignUi(v, send) {
  resignBtn.hidden = !v.canResign || !!v.paused;
  if (resignBtn.hidden && resignDialog.open) resignDialog.close();
  resignDialog.querySelector("#resign-yes").onclick = () => {
    resignDialog.close();
    send({ t: "resign" });
  };
}
