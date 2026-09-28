// REVERSI (Othello): 2 คน กระดาน 8x8 เริ่มด้วยหมากตรงกลาง 4 ตัว Black เดินก่อน
// วางหมากให้หนีบหมากอีกฝ่ายเป็นเส้นตรง (แนวนอน ตั้ง ทแยง) หมากที่โดนหนีบพลิกเป็นสีเรา ต้องพลิกได้อย่างน้อย 1 ตัวถึงวางได้
// ไม่มีที่วาง Pass ให้อัตโนมัติ ทั้งคู่วางไม่ได้จบเกม หมากมากกว่าชนะ ชนะได้ 1 เกมต่อไปสลับสี
// กระดาน: string ยาว 64 ช่อง i = แถว * 8 + คอลัมน์ "." ว่าง "b" Black "w" White
const N = 8;
const pl = (s, id) => s.players.find((p) => p.id === id);
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);
const foe = (c) => (c === "b" ? "w" : "b");
const TURN = 15000; // เวลาต่อตา (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ) หมดเวลาสุ่มวางช่องที่วางได้
const START = (() => {
  const a = Array(N * N).fill(".");
  a[27] = a[36] = "w";
  a[28] = a[35] = "b";
  return a.join("");
})();
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// หมากที่พลิกได้ถ้าสี c วางที่ i (วางไม่ได้คืน [])
export function flips(b, i, c) {
  if (b[i] !== ".") return [];
  const r0 = Math.floor(i / N), c0 = i % N, out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let r = r0 + dr, k = c0 + dc;
    while (r >= 0 && r < N && k >= 0 && k < N && b[r * N + k] === foe(c)) {
      line.push(r * N + k);
      r += dr;
      k += dc;
    }
    if (line.length && r >= 0 && r < N && k >= 0 && k < N && b[r * N + k] === c) out.push(...line);
  }
  return out;
}
const moves = (b, c) => [...Array(N * N).keys()].filter((i) => flips(b, i, c).length);
const count = (b, c) => [...b].filter((x) => x === c).length;

const idOf = (s, c) => (c === "b" ? s.black : other(s, s.black));
const colorOf = (s, id) => (id === s.black ? "b" : "w");

function place(s, i) {
  const a = s.board.split("");
  const turned = flips(s.board, i, s.turn);
  for (const k of [i, ...turned]) a[k] = s.turn;
  s.board = a.join("");
  s.last = i;
  s.flipped = turned;
  s.pass = null;
  // อีกฝ่ายไม่มีที่วาง Pass ให้ ถ้าเราก็ไม่มีด้วยจบเกม
  if (moves(s.board, foe(s.turn)).length) s.turn = foe(s.turn);
  else if (moves(s.board, s.turn).length) s.pass = foe(s.turn);
  else finish(s);
}

function finish(s) {
  const b = count(s.board, "b"), w = count(s.board, "w");
  s.phase = "over";
  s.winner = b === w ? null : idOf(s, b > w ? "b" : "w");
  if (s.winner) pl(s, s.winner).score++;
}

function start(s) {
  // เกมแรกเจ้าของห้องเป็น Black เกมต่อไปสลับสี
  s.black = s.black && s.players.some((p) => p.id === s.black) ? other(s, s.black) : s.owner;
  Object.assign(s, { phase: "play", board: START, turn: "b", last: null, flipped: [], pass: null, winner: null });
}

// วางหมาก (หรือเกมใหม่) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.turn, s.board].join();

export default {
  max: 2,
  init: () => ({ time: TURN, phase: "lobby" }),
  player: () => ({ score: 0 }),

  handle(s, id, msg, now) {
    const key = turnKey(s);
    if (s.phase === "play") {
      // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
      if (msg.t === "timeout" && now >= s.turnEnds) {
        const ok = moves(s.board, s.turn);
        place(s, ok[Math.floor(Math.random() * ok.length)]);
      }
      if (msg.t === "move" && idOf(s, s.turn) === id && Number.isInteger(msg.i) && msg.i >= 0 && msg.i < N * N && flips(s.board, msg.i, s.turn).length) place(s, msg.i);
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length === 2) start(s);
      if (msg.t === "newgame" && s.phase === "over") s.phase = "lobby";
    }
    if (turnKey(s) !== key) s.turnEnds = now + s.time;
  },

  // อีกคนออก กลับไปรอคนใหม่ เริ่มนับคะแนนใหม่
  leave(s) {
    for (const p of s.players) p.score = 0;
    s.black = null;
    s.phase = "lobby";
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, time: s.time,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score, color: s.phase === "lobby" ? null : colorOf(s, p.id) })),
    };
    if (s.phase !== "lobby") {
      const mine = colorOf(s, id), myTurn = s.phase === "play" && s.turn === mine;
      Object.assign(v, {
        board: s.board, turn: s.turn, mine, myTurn, last: s.last, flipped: s.flipped, pass: s.pass,
        count: { b: count(s.board, "b"), w: count(s.board, "w") },
        moves: myTurn ? moves(s.board, mine) : [],
        winner: s.winner && pl(s, s.winner).name,
        // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      });
    }
    return v;
  },
};
