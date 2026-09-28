// LUDO: 2-4 คน คนละ 4 ตัว ทอยเต๋าเดินรอบกระดานตามเข็มนาฬิกา แล้วเข้าทางสีตัวเองไปเส้นชัยตรงกลาง
// ได้ 6 ออกจากบ้านได้และทอยอีกครั้ง 6 ติดกัน 3 ครั้งเสียตา กินหมากคนอื่นหรือเข้าเส้นชัยได้ทอยอีกครั้ง
// ช่องเริ่มกับช่องดาวกินไม่ได้ เข้าเส้นชัยต้องได้แต้มพอดี เข้าเส้นชัยครบ 4 ตัวก่อนชนะ
// ตำแหน่งหมาก (นับจากช่องเริ่มของสีนั้น): -1 ในบ้าน, 0-50 บนทางรอบกระดาน, 51-55 ทางเข้าเส้นชัย, 56 ถึงเส้นชัย
// ทางรอบกระดาน 52 ช่อง ช่องเริ่มของสี c อยู่ที่ c * 13 สี 0 แดง 1 เขียว 2 เหลือง 3 น้ำเงิน
import { leaveOpening, openingView, rollOpening, startOpening } from "./opening.js";

const pl = (s, id) => s.players.find((p) => p.id === id);
const TURN = 15000; // เวลาต่อการทอยหรือเดินหนึ่งครั้ง (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ)
const HOME = 56;
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47]; // ช่องเริ่มและช่องดาว
const COLORS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] }; // 2 คนนั่งตรงข้ามกัน
const cell = (p, t) => (p.color * 13 + t) % 52;

const canMove = (t, n) => (t < 0 ? n === 6 : t + n <= HOME);
const movable = (s, p) => [0, 1, 2, 3].filter((k) => canMove(p.tokens[k], s.dice));

function nextTurn(s, from = s.turn) {
  s.turn = s.order[(s.order.indexOf(from) + 1) % s.order.length];
  Object.assign(s, { dice: null, sixes: 0 });
}

// ทอย: 6 ครั้งที่ 3 เสียตา เดินไม่ได้ก็เสียตา (แต่ได้ 6 ทอยใหม่) เดินได้ตัวเดียวเดินให้เลย
function roll(s) {
  const p = pl(s, s.turn);
  s.dice = 1 + Math.floor(Math.random() * 6);
  s.rolls++;
  s.sixes = s.dice === 6 ? s.sixes + 1 : 0;
  s.roll = { id: p.id, n: s.dice, rolls: s.rolls };
  s.log = null;
  if (s.sixes === 3) {
    s.log = { t: "three", id: p.id };
    return nextTurn(s);
  }
  const ks = movable(s, p);
  if (!ks.length) {
    s.log = { t: "stuck", id: p.id };
    if (s.dice === 6) s.dice = null;
    else nextTurn(s);
  } else if (new Set(ks.map((k) => p.tokens[k])).size === 1) move(s, p, ks[0]);
}

function move(s, p, k) {
  const from = p.tokens[k], to = from < 0 ? 0 : from + s.dice;
  p.tokens[k] = to;
  s.moves++;
  const caps = [];
  if (to <= 50 && !SAFE.includes(cell(p, to))) {
    for (const q of s.players) {
      if (q === p || !s.order.includes(q.id)) continue;
      q.tokens.forEach((t, j) => {
        if (t >= 0 && t <= 50 && cell(q, t) === cell(p, to)) {
          q.tokens[j] = -1;
          caps.push(q.id);
        }
      });
    }
  }
  s.log = { t: "move", id: p.id, k, from, to, caps };
  const bonus = s.dice === 6 || caps.length > 0 || to === HOME;
  s.dice = null;
  if (p.tokens.every((t) => t === HOME)) {
    s.phase = "over";
    s.winner = p.id;
  } else if (!bonus) nextTurn(s);
}

// หมดเวลา: ยังไม่ทอยก็ทอยให้ ทอยแล้วเดินตัวที่ไปไกลที่สุดที่เดินได้
function timeUp(s) {
  if (s.dice === null) return roll(s);
  const p = pl(s, s.turn);
  const ks = movable(s, p).sort((a, b) => p.tokens[b] - p.tokens[a]);
  move(s, p, ks[0]);
}

// ทอยหรือเดินแล้ว (หรือตาเปลี่ยน) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.turn, s.rolls, s.moves].join();

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { color: null, tokens: [-1, -1, -1, -1] });
  s.phase = "lobby";
}

export default {
  max: 4,
  init: () => ({ time: TURN, phase: "lobby" }),
  player: () => ({ color: null, tokens: [-1, -1, -1, -1] }),

  handle(s, id, msg, now) {
    const key = turnKey(s);
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && s.phase === "play" && now >= s.turnEnds) timeUp(s);
    if (msg.t === "first-roll") rollOpening(s, id);
    if (s.phase === "play" && s.turn === id) {
      if (msg.t === "roll" && s.dice === null) roll(s);
      if (msg.t === "move" && s.dice !== null && movable(s, pl(s, id)).includes(msg.k)) move(s, pl(s, id), msg.k);
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        toLobby(s);
        s.players.forEach((p, i) => (p.color = COLORS[s.players.length][i]));
        s.order = s.players.map((p) => p.id);
        startOpening(s);
      }
      // ทอยหาคนเริ่มเสร็จแล้ว คนที่ได้เริ่มทอยก่อน แล้ววนตามเข็มนาฬิกา (ตามลำดับสี)
      if (msg.t === "go" && s.phase === "order" && s.opening.starter) {
        Object.assign(s, { phase: "play", turn: s.opening.starter, dice: null, sixes: 0, rolls: 0, moves: 0, roll: null, log: null, winner: null });
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
    if (turnKey(s) !== key) s.turnEnds = now + s.time;
  },

  // คนออก: หมากของเขาออกจากกระดาน ถ้าถึงตาเขาไปคนถัดไป เหลือคนเดียวกลับไปรอ
  leave(s, id) {
    if (s.phase === "lobby" || s.phase === "over" || !s.order.includes(id)) return;
    const key = turnKey(s);
    if (s.phase === "order") {
      if (s.players.length < 2) return toLobby(s);
      leaveOpening(s, id);
    }
    if (s.phase === "play" && s.turn === id) nextTurn(s, id);
    s.order = s.order.filter((x) => x !== id);
    if (s.order.length < 2) return toLobby(s);
    if (turnKey(s) !== key) s.turnEnds = Date.now() + s.time;
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, time: s.time,
      players: s.players.map((p) => ({ id: p.id, name: p.name, color: p.color, home: p.tokens.filter((t) => t === HOME).length })),
    };
    if (s.phase === "order") v.opening = openingView(s, id);
    else if (s.phase !== "lobby") {
      const me = pl(s, id);
      Object.assign(v, {
        seats: s.order.map((x) => pl(s, x)).map((p) => ({ id: p.id, name: p.name, color: p.color, tokens: p.tokens })),
        mine: me.color, turn: s.turn, myTurn: s.phase === "play" && s.turn === id,
        dice: s.dice, rolls: s.rolls, roll: s.roll, log: s.log, winner: s.winner && pl(s, s.winner).name,
        movable: s.phase === "play" && s.turn === id && s.dice !== null ? movable(s, me) : [],
        // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      });
    }
    return v;
  },
};
