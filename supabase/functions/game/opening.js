// ทอยหาคนเริ่ม (เกมลูกเต๋า): ทุกคนทอยเต๋า 2 ลูก แต้มรวมมากสุดเริ่มก่อน เสมอกันทอยใหม่เฉพาะคนที่เสมอ
// ตัดสินได้แล้วค้างผลไว้ให้ทุกคนเห็น แล้วเจ้าของห้องส่ง "go" ให้เกมเริ่มเล่น
const d6 = () => 1 + Math.floor(Math.random() * 6);
const sum = (d) => d[0] + d[1];

export function startOpening(s) {
  s.phase = "order";
  s.opening = { rolls: {}, left: s.players.map((p) => p.id), rolled: [], tie: 0, starter: null };
}

export function rollOpening(s, id) {
  const o = s.opening;
  if (s.phase !== "order" || o.starter || !o.left.includes(id) || o.rolled.includes(id)) return;
  o.rolls[id] = [d6(), d6()];
  o.rolled.push(id);
  settle(s);
}

// ทุกคนที่ต้องทอยทอยครบแล้ว หาคนแต้มมากสุด
function settle(s) {
  const o = s.opening;
  if (o.left.some((id) => !o.rolled.includes(id))) return;
  const top = Math.max(...o.left.map((id) => sum(o.rolls[id])));
  const best = o.left.filter((id) => sum(o.rolls[id]) === top);
  if (best.length === 1) o.starter = best[0];
  else Object.assign(o, { left: best, rolled: [], tie: top });
}

// คนออกระหว่างทอย: ถ้าเป็นคนที่ได้เริ่มหรือไม่เหลือใครต้องทอย เริ่มทอยใหม่ทั้งหมด
export function leaveOpening(s, id) {
  const o = s.opening;
  o.left = o.left.filter((x) => x !== id);
  o.rolled = o.rolled.filter((x) => x !== id);
  delete o.rolls[id];
  if (o.starter === id || !o.left.length) startOpening(s);
  else if (!o.starter) settle(s);
}

export function openingView(s, id) {
  const o = s.opening;
  return {
    players: s.players.map((p) => ({ name: p.name, me: p.id === id, dice: o.rolls[p.id] || null, out: !o.left.includes(p.id) || (!!o.starter && o.starter !== p.id) })),
    tie: o.tie,
    starter: o.starter && s.players.find((p) => p.id === o.starter).name,
    mine: !o.starter && o.left.includes(id) && !o.rolled.includes(id),
  };
}
