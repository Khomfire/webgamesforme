// FARKLE: 2 คนขึ้นไป ผลัดกันทอยเต๋า 6 ลูก เก็บแต้มจนถึงเป้าหมาย แล้วคนอื่นได้อีกคนละตา
import { leaveOpening, openingView, rollOpening, startOpening } from "./opening.js";

const pl = (s, id) => s.players.find((p) => p.id === id);
const TURN = 20000; // เวลาต่อการทอยหนึ่งครั้ง (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ)

// แต้มของเต๋าชุดที่เลือก ถ้ามีลูกไหนไม่ได้แต้มคืน 0 (หน้าเกมมีสำเนาไว้โชว์แต้ม ต้องแก้ให้ตรงกัน)
export function score(dice) {
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach((v) => c[v]++);
  const counts = c.slice(1);
  // ชุดพิเศษที่ใช้ครบ 6 ลูก คิดเทียบกับแต้มแบบนับทีละชุด แล้วเอาที่มากกว่า
  let combo = 0;
  if (dice.length === 6) {
    if (counts.every((n) => n === 1)) combo = 1500;                       // 1-2-3-4-5-6
    if (counts.filter((n) => n === 2).length === 3) combo = 1500;         // 3 คู่
    if (counts.includes(4) && counts.includes(2)) combo = 1500;           // 4 ลูก + คู่
    if (counts.filter((n) => n === 3).length === 2) combo = 2500;         // ตอง 2 ชุด
  }
  let pts = 0;
  for (let f = 1; f <= 6; f++) {
    const n = c[f];
    if (n >= 3) pts += (f === 1 ? 1000 : f * 100) * (n - 2); // 3 ลูก = ตอง, 4 = ตอง x2, 5 = x3, 6 = x4
    else if (f === 1) pts += 100 * n;
    else if (f === 5) pts += 50 * n;
    else if (n) return combo;
  }
  return Math.max(combo, pts);
}
// ทอยแล้วมีเต๋าที่เก็บแต้มได้อย่างน้อยหนึ่งชุดไหม
export const canScore = (dice) =>
  dice.some((v) => v === 1 || v === 5) || [2, 3, 4, 6].some((f) => dice.filter((v) => v === f).length >= 3) || score(dice) > 0;

function nextTurn(s) {
  s.turn = (s.turn + 1) % s.order.length;
  Object.assign(s, { dice: [], kept: [], turnPts: 0, left: 6 });
}

function roll(s) {
  if (s.left === 0) { s.left = 6; s.kept = []; } // มีแต้มครบ 6 ลูก ทอยใหม่ทั้งหมด
  s.dice = Array.from({ length: s.left }, () => 1 + Math.floor(Math.random() * 6));
  s.rolls++;
  if (!canScore(s.dice)) {
    s.last = { name: pl(s, s.order[s.turn]).name, dice: s.dice, kept: s.kept, farkle: true, lost: s.turnPts, n: s.rolls };
    endTurn(s);
  }
}

function bank(s) {
  const p = pl(s, s.order[s.turn]);
  p.score += s.turnPts;
  s.last = { name: p.name, pts: s.turnPts, n: s.rolls };
  endTurn(s);
}

// รอบสุดท้าย: คนแรกที่ถึงเป้าหมายจบตาแล้ว คนอื่นได้เล่นอีกคนละตา
function endTurn(s) {
  const id = s.order[s.turn];
  if (s.final) s.final = s.final.filter((x) => x !== id);
  else if (pl(s, id).score >= s.target) s.final = s.order.filter((x) => x !== id);
  if (s.final && s.final.length === 0) finish(s);
  else nextTurn(s);
}

// หมดเวลา: เก็บเต๋าชุดที่ได้แต้มมากสุดจากที่ทอยไว้ แล้วเก็บแต้มจบตา (ยังไม่ได้ทอยก็จบตาเลย)
function timeUp(s) {
  let best = [];
  for (let m = 1; m < 1 << s.dice.length; m++) {
    const kept = s.dice.filter((_, i) => m & (1 << i));
    if (score(kept) > score(best)) best = kept;
  }
  s.turnPts += score(best);
  s.kept.push(...best);
  bank(s);
}

// ตาเปลี่ยนหรือทอยใหม่ เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.order && s.order[s.turn], s.rolls].join();

function finish(s) {
  const top = Math.max(...s.players.map((p) => p.score));
  s.phase = "over";
  s.winners = s.players.filter((p) => p.score === top).map((p) => p.name);
}

export default {
  init: () => ({ target: 5000, time: TURN, phase: "lobby" }),
  player: () => ({ score: 0 }),

  handle(s, id, msg, now) {
    const key = turnKey(s);
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && s.phase === "play" && now >= s.turnEnds) timeUp(s);
    if (msg.t === "first-roll") rollOpening(s, id);
    if (s.phase === "play" && s.order[s.turn] === id && (msg.t === "roll" || msg.t === "bank")) {
      // เต๋าที่เลือกเก็บต้องได้แต้มทุกลูก ยกเว้นตอนเริ่มตาที่ยังไม่มีเต๋า
      const keep = [...new Set(msg.keep)].filter((i) => Number.isInteger(i) && i >= 0 && i < s.dice.length);
      const kept = keep.map((i) => s.dice[i]);
      const pts = score(kept);
      if (s.dice.length ? pts > 0 : msg.t === "roll") {
        s.turnPts += pts;
        s.kept.push(...kept);
        s.left -= kept.length;
        if (msg.t === "roll") roll(s);
        else bank(s);
      }
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 20)) * 1000;
      if (msg.t === "target") s.target = Math.min(20000, Math.max(500, Math.round(Number(msg.value) / 500) * 500 || 5000));
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) startOpening(s);
      // ทอยหาคนเริ่มเสร็จแล้ว คนที่ได้เริ่มเล่นตาแรก
      if (msg.t === "go" && s.phase === "order" && s.opening.starter) {
        const order = s.players.map((p) => p.id);
        Object.assign(s, { phase: "play", order, turn: order.indexOf(s.opening.starter) - 1, rolls: 0, last: null, final: null });
        nextTurn(s);
      }
      if (msg.t === "newgame" && s.phase === "over") {
        for (const p of s.players) p.score = 0;
        s.phase = "lobby";
      }
    }
    if (turnKey(s) !== key) s.turnEnds = now + (s.time || TURN);
  },

  leave(s, id) {
    const key = turnKey(s);
    if (s.phase === "order") {
      if (s.players.length < 2) s.phase = "lobby";
      else leaveOpening(s, id);
    }
    if (s.phase !== "play") return;
    const i = s.order.indexOf(id);
    s.order.splice(i, 1);
    if (s.final) s.final = s.final.filter((x) => x !== id);
    if (s.order.length < 2) {
      for (const p of s.players) p.score = 0;
      s.phase = "lobby";
    } else if (s.final && s.final.length === 0) {
      finish(s);
    } else if (i < s.turn) {
      s.turn--;
    } else if (i === s.turn) {
      s.turn--;
      nextTurn(s);
    }
    if (turnKey(s) !== key) s.turnEnds = Date.now() + (s.time || TURN);
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, target: s.target, time: s.time || TURN,
      players: s.players.map((p) => ({ name: p.name, score: p.score, now: s.phase === "play" && s.order[s.turn] === p.id })),
    };
    if (s.phase === "order") v.opening = openingView(s, id);
    else if (s.phase !== "lobby") {
      Object.assign(v, {
        myTurn: s.phase === "play" && s.order[s.turn] === id,
        turnName: s.phase === "play" ? pl(s, s.order[s.turn]).name : "",
        dice: s.dice, kept: s.kept, turnPts: s.turnPts, rolls: s.rolls, last: s.last, final: !!s.final, winners: s.winners,
        // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      });
    }
    return v;
  },
};
