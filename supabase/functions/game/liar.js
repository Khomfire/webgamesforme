// LIAR'S DICE: ทุกคนทอยเต๋าลับ ผลัดกันเสนอ จับโกหกแล้วคนผิดเสีย 1 ลูก เหลือเต๋าคนสุดท้ายชนะ
// กฎเสริมที่เจ้าของห้องเปิดได้: wild (หน้า 1 แทนทุกหน้า) และ palifico
import { leaveOpening, openingView, rollOpening, startOpening } from "./opening.js";

const pl = (s, id) => s.players.find((p) => p.id === id);

// เสนอใหม่ต้องสูงกว่าเดิม: จำนวนมากกว่า หรือจำนวนเท่ากันแต่หน้าสูงกว่า
// wild: เปิดรอบด้วยหน้า 1 ไม่ได้ เปลี่ยนไปหน้า 1 ใช้จำนวนครึ่งหนึ่ง (ปัดขึ้น) เปลี่ยนจากหน้า 1 ใช้สองเท่า + 1
// pal (รอบ palifico): ห้ามเปลี่ยนหน้า เพิ่มได้แค่จำนวน
// (หน้าเกมมีสำเนาไว้เปิดปิดปุ่มเสนอ ต้องแก้ให้ตรงกัน)
export function higher(a, b, { wild, pal }) {
  if (pal) return !b || (a.face === b.face && a.n > b.n);
  if (!wild) return !b || a.n > b.n || (a.n === b.n && a.face > b.face);
  if (!b) return a.face !== 1;
  if (a.face === 1) return b.face === 1 ? a.n > b.n : a.n >= Math.ceil(b.n / 2);
  if (b.face === 1) return a.n >= b.n * 2 + 1;
  return a.n > b.n || (a.n === b.n && a.face > b.face);
}
const counts = (d, face, wild) => d === face || (wild && d === 1);
// กฎของรอบนี้: รอบ palifico หน้า 1 ไม่แทนหน้าอื่น
const mode = (s) => ({ wild: s.wild && !s.pal, pal: s.pal });

const alive = (s) => s.order.filter((id) => pl(s, id).count > 0);
const total = (s) => alive(s).reduce((n, x) => n + pl(s, x).count, 0);
// คนถัดไปที่ยังมีเต๋า เรียงตามลำดับที่นั่ง
function nextAlive(s, id) {
  const i = s.order.indexOf(id);
  for (let k = 1; k <= s.order.length; k++) {
    const next = s.order[(i + k) % s.order.length];
    if (next !== id && pl(s, next).count > 0) return next;
  }
  return id;
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { count: 0, hand: [] });
  s.phase = "lobby";
  s.pal = false;
}

function startRound(s, first) {
  for (const id of alive(s)) {
    const p = pl(s, id);
    p.hand = Array.from({ length: p.count }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
  }
  Object.assign(s, { phase: "play", turn: first, bid: null, reveal: null, ready: [] });
  s.round++;
}

// จับโกหก: เปิดเต๋าทุกคน นับหน้าที่เสนอ คนผิดเสีย 1 ลูก
// palifico: ใครเหลือ 1 ลูก รอบถัดไป (ที่เขาเริ่ม) เป็นรอบ palifico
function call(s, caller) {
  const { n, face, by } = s.bid;
  const { wild } = mode(s);
  const hands = alive(s).map((id) => ({ name: pl(s, id).name, dice: pl(s, id).hand }));
  const count = hands.reduce((c, h) => c + h.dice.filter((d) => counts(d, face, wild)).length, 0);
  const loser = count >= n ? caller : by;
  pl(s, loser).count--;
  s.pal = s.palifico && pl(s, loser).count === 1;
  s.reveal = { n, face, count, wild, bidder: pl(s, by).name, caller: pl(s, caller).name, loser: pl(s, loser).name, hands };
  const left = alive(s);
  if (left.length === 1) {
    s.phase = "over";
    s.winner = pl(s, left[0]).name;
  } else {
    s.phase = "reveal";
    s.first = pl(s, loser).count ? loser : nextAlive(s, loser);
  }
}

export default {
  init: () => ({ start: 5, wild: true, palifico: false, pal: false, phase: "lobby" }),
  player: () => ({ count: 0, hand: [] }),

  handle(s, id, msg) {
    if (msg.t === "first-roll") rollOpening(s, id);
    if (s.phase === "play" && s.turn === id) {
      const bid = { n: Number(msg.n), face: Number(msg.face) };
      if (msg.t === "bid" && Number.isInteger(bid.n) && Number.isInteger(bid.face) && bid.n >= 1 && bid.n <= total(s) && bid.face >= 1 && bid.face <= 6 && higher(bid, s.bid, mode(s))) {
        s.bid = { ...bid, by: id };
        s.turn = nextAlive(s, id);
      }
      if (msg.t === "liar" && s.bid) call(s, id);
    }
    if (msg.t === "ready" && s.phase === "reveal" && pl(s, id).count > 0) {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length >= alive(s).length) startRound(s, s.first);
    }
    if (id === s.owner) {
      if (msg.t === "start-dice") s.start = Math.min(5, Math.max(1, Math.round(Number(msg.value)) || 5));
      if (msg.t === "rule" && s.phase === "lobby" && (msg.key === "wild" || msg.key === "palifico")) s[msg.key] = !!msg.on;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        s.order = s.players.map((p) => p.id);
        for (const p of s.players) p.count = s.start;
        s.round = 0;
        startOpening(s);
      }
      // ทอยหาคนเริ่มเสร็จแล้ว คนที่ได้เริ่มเสนอก่อน
      if (msg.t === "go" && s.phase === "order" && s.opening.starter) startRound(s, s.opening.starter);
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
  },

  // ผู้เล่นถูกเอาออกจาก s.players แล้ว แต่ยังอยู่ใน s.order จนกว่าจะเอาออกตรงนี้
  leave(s, id, gone) {
    if (!s.order || !s.order.includes(id)) return;
    const next = nextAlive(s, id);
    s.order.splice(s.order.indexOf(id), 1);
    if (s.phase === "order") {
      if (s.players.length < 2) toLobby(s);
      else leaveOpening(s, id);
    }
    if (s.phase !== "play" && s.phase !== "reveal") return;
    if (alive(s).length < 2) toLobby(s);
    else if (s.phase === "play" && gone.count) startRound(s, s.turn === id ? next : s.turn); // ทอยใหม่ทั้งวง
    else if (s.phase === "reveal") {
      s.ready = s.ready.filter((x) => x !== id);
      if (s.first === id) s.first = next;
      if (s.ready.length >= alive(s).length) startRound(s, s.first);
    }
  },

  view(s, id) {
    const v = {
      screen: s.phase, start: s.start, rules: { wild: s.wild, palifico: s.palifico },
      players: s.players.map((p) => ({ name: p.name, count: p.count, now: s.phase === "play" && s.turn === p.id })),
    };
    if (s.phase === "order") v.opening = openingView(s, id);
    else if (s.phase !== "lobby") {
      const me = pl(s, id);
      Object.assign(v, {
        myTurn: s.phase === "play" && s.turn === id,
        turnName: s.phase === "play" ? pl(s, s.turn).name : "",
        hand: s.phase === "play" ? me.hand : [], // เห็นแค่เต๋าตัวเอง
        out: me.count === 0,
        total: total(s),
        bid: s.bid && { n: s.bid.n, face: s.bid.face, name: (pl(s, s.bid.by) || {}).name },
        round: s.round, reveal: s.reveal, winner: s.winner, ...mode(s),
        ready: s.ready.includes(id), readyCount: s.ready.length, aliveCount: alive(s).length,
      });
    }
    return v;
  },
};
