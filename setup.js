// ตั้งค่าในห้องรอ: แถวละค่า ชื่ออยู่ซ้าย ค่าอยู่ขวา เจ้าของห้องกด - / + (คนอื่นเห็นแค่ค่า)
// แต่ละค่าคือ { key, label, value, unit, min, max, step } หรือ { key, label, value, options: [...] }
// ค่าเปิด/ปิดคือ { label, on, toggle } กดแล้วเรียก toggle()
// หน้าเกมใส่ setupHtml(items, isHost) ในหน้าห้องรอ แล้วเรียก setupBind(app, items, send)
// รายชื่อในห้องรอใช้ <ul class="chips"> เรียงชื่อต่อกันเป็นป้าย
const setupStyle = document.createElement("style");
setupStyle.textContent = `
  .setup { margin: 0 0 8px; }
  .set { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; border-bottom: 2px dotted #2c2950; }
  .set > span { color: var(--dim); }
  .set b { font-weight: 700; color: var(--yellow); }
  .set small { margin-left: 6px; color: var(--dim); font-size: 0.85rem; }
  .step { display: flex; align-items: center; gap: 8px; }
  .step output { min-width: 7em; text-align: center; }
  .step button { --c: var(--cyan); width: 36px; height: 36px; margin: 0; padding: 0; box-shadow: 3px 3px 0 var(--c); font: 400 0.9rem "Press Start 2P", "Chakra Petch", monospace; }
  .step button:active:not(:disabled) { transform: translate(3px, 3px); }
  /* สวิตช์เปิด/ปิด: กล่องยาวมีก้อนสี่เหลี่ยม ปิดอยู่ซ้าย เปิดอยู่ขวา */
  .switch { position: relative; display: block; width: 60px; height: 32px; margin: 0; padding: 0; border: 3px solid var(--dim); box-shadow: none; background: var(--screen); }
  .switch::after { content: ""; position: absolute; top: 4px; left: 4px; width: 18px; height: 18px; background: var(--dim); }
  .switch.on { border-color: var(--cyan); }
  .switch.on::after { left: 32px; background: var(--cyan); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips li { padding: 2px 10px; border: 2px solid #2c2950; }
`;
document.head.append(setupStyle);

// รายการค่าที่เลือกได้ของแต่ละช่อง
const setupValues = (it) => it.options || Array.from({ length: Math.floor((it.max - it.min) / (it.step || 1)) + 1 }, (_, i) => it.min + i * (it.step || 1));
const setupShow = (it, value) => `<b>${value}</b>${it.unit ? `<small>${it.unit}</small>` : ""}`;

function setupHtml(items, isHost) {
  return `<div class="setup">${items.map((it, i) => {
    if ("on" in it) {
      return `<div class="set"><span>${it.label}</span>${isHost
        ? `<button class="switch${it.on ? " on" : ""}" data-set="${i}" aria-pressed="${it.on}" aria-label="${it.label}"></button>`
        : `<span class="switch${it.on ? " on" : ""}" role="img" aria-label="${it.label} ${it.on ? "เปิด" : "ปิด"}"></span>`}</div>`;
    }
    if (!isHost) return `<div class="set"><span>${it.label}</span><span>${setupShow(it, it.value)}</span></div>`;
    const values = setupValues(it);
    return `<div class="set"><span id="set-${i}">${it.label}</span>
      <div class="step" role="group" aria-labelledby="set-${i}">
        <button data-set="${i}" data-dir="-1" aria-label="ลด" ${it.value <= values[0] ? "disabled" : ""}>-</button>
        <output aria-live="polite">${setupShow(it, it.value)}</output>
        <button data-set="${i}" data-dir="1" aria-label="เพิ่ม" ${it.value >= values[values.length - 1] ? "disabled" : ""}>+</button>
      </div></div>`;
  }).join("")}</div>`;
}

// กดรัวได้: ขยับค่าที่แสดงทันทีแล้วส่งไป server รอบถัดไปวาดใหม่ตามค่าจริงจาก server
function setupBind(root, items, send) {
  const current = items.map((it) => it.value);
  root.querySelectorAll("[data-set]").forEach((b) => (b.onclick = () => {
    const i = Number(b.dataset.set), it = items[i];
    if ("on" in it) return it.toggle();
    const values = setupValues(it);
    const at = values.findIndex((x) => x >= current[i]);
    const value = values[Math.min(values.length - 1, Math.max(0, (at < 0 ? values.length - 1 : at) + Number(b.dataset.dir)))];
    current[i] = value;
    const row = b.parentElement;
    row.querySelector("output").innerHTML = setupShow(it, value);
    row.firstElementChild.disabled = value <= values[0];
    row.lastElementChild.disabled = value >= values[values.length - 1];
    send({ t: it.key, value });
  }));
}
