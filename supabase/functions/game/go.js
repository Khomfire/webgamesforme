// GO: 2 คน กติกาจีน นับแต้มแบบ Area (หมากที่อยู่ + พื้นที่ที่ล้อม) Komi 7.5 ห้ามฆ่าตัวเอง Ko แบบ Positional superko
// นาฬิกาฝ่ายละ X นาที เล่นหลายเกมสลับสีกัน ชนะได้ 1
// กระดาน: string ยาว n * n จุด i = แถว * n + คอลัมน์ "." ว่าง "b" Black "w" White
// Pass ติดกัน 2 ครั้ง เข้าช่วงนับแต้ม: ทั้งคู่แตะกลุ่มที่ตายแล้ว กด Done ทั้งคู่จบเกม หรือกด Resume เล่นต่อ
const pl = (s, id) => s.players.find((p) => p.id === id);
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);
const foe = (c) => (c === "b" ? "w" : "b");
const KOMI = 7.5;
const SIZES = [9, 13, 19];
const TIMES = [5, 10, 20, 30, 60];

function around(n, i) {
  const r = Math.floor(i / n), c = i % n, out = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

// กลุ่มที่ต่อกับจุด i (จุดที่เป็นแบบเดียวกันและติดกัน) กับจุดรอบกลุ่มที่เป็นอย่างอื่น
function group(b, n, i) {
  const seen = new Set([i]), stack = [i], edge = new Set();
  while (stack.length) {
    for (const j of around(n, stack.pop())) {
      if (b[j] === b[i]) { if (!seen.has(j)) { seen.add(j); stack.push(j); } }
      else edge.add(j);
    }
  }
  return { stones: [...seen], edge: [...edge] };
}
const noLiberty = (b, n, g) => !g.edge.some((j) => b[j] === ".");

// FNV-1a 32 บิต เก็บแค่ค่านี้ของทุกตำแหน่งที่เคยเกิด (ไว้เช็ก Ko) ไม่ต้องเก็บกระดานเต็ม
function hash(b) {
  let h = 0x811c9dc5;
  for (let k = 0; k < b.length; k++) h = Math.imul(h ^ b.charCodeAt(k), 0x01000193);
  return (h >>> 0).toString(36);
}

// วางหมากสี c ที่ i คืนกระดานใหม่ หรือ null ถ้าผิดกติกา (จุดไม่ว่าง ฆ่าตัวเอง Ko)
function place(b, n, seen, i, c) {
  if (b[i] !== ".") return null;
  const a = b.split("");
  a[i] = c;
  for (const j of around(n, i)) {
    if (a[j] !== foe(c)) continue;
    const g = group(a, n, j);
    if (noLiberty(a, n, g)) for (const k of g.stones) a[k] = ".";
  }
  if (noLiberty(a, n, group(a, n, i))) return null;
  const next = a.join("");
  return seen.includes(hash(next)) ? null : next;
}

// นับแต้ม: เอาหมากตายออก จุดว่างที่ล้อมด้วยสีเดียวเป็นพื้นที่ของสีนั้น (ติดทั้งสองสีไม่เป็นของใคร)
function count(b, n, dead) {
  const a = b.split("");
  for (const i of dead) a[i] = ".";
  const terr = Array(n * n).fill("."), seen = new Set();
  for (let i = 0; i < n * n; i++) {
    if (a[i] !== "." || seen.has(i)) continue;
    const g = group(a, n, i);
    g.stones.forEach((k) => seen.add(k));
    const colors = new Set(g.edge.map((j) => a[j]));
    if (colors.size === 1) for (const k of g.stones) terr[k] = [...colors][0];
  }
  const pts = (c) => a.filter((x) => x === c).length + terr.filter((x) => x === c).length;
  return { terr: terr.join(""), points: { b: pts("b"), w: pts("w") + KOMI } };
}

const idOf = (s, c) => (c === "b" ? s.black : other(s, s.black));
const colorOf = (s, id) => (id === s.black ? "b" : "w");

function finish(s, winner, reason, margin) {
  s.phase = "over";
  s.turnEnds = null;
  s.result = { winner, reason, margin };
  pl(s, winner).score += 1;
}

// ตาเดิน (วางหมากหรือ Pass) เดินแล้วนาฬิกาเปลี่ยนไปอีกฝ่าย
function turnDone(s, now) {
  const c = s.turn;
  s.clock[c] = s.turnEnds - now;
  s.turn = foe(c);
  s.turnEnds = now + s.clock[s.turn];
}

function start(s, now) {
  // เกมแรกเจ้าของห้องเป็น Black เกมต่อไปสลับสี
  s.black = s.black && s.players.some((p) => p.id === s.black) ? other(s, s.black) : s.owner;
  const board = ".".repeat(s.size * s.size);
  Object.assign(s, {
    phase: "play", n: s.size, board, turn: "b", seen: [hash(board)], passes: 0, last: null,
    clock: { b: s.time, w: s.time }, turnEnds: now + s.time, dead: [], done: [], result: null,
  });
}

export default {
  max: 2,
  init: () => ({ size: 9, time: 600000, phase: "lobby" }),
  player: () => ({ score: 0 }),
  canResign: (s) => s.phase === "play" || s.phase === "score",

  handle(s, id, msg, now) {
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (s.phase === "play" && now >= s.turnEnds && ["timeout", "move", "pass"].includes(msg.t)) {
      s.clock[s.turn] = 0;
      finish(s, idOf(s, foe(s.turn)), "time");
      return;
    }
    if (s.phase === "play" && idOf(s, s.turn) === id) {
      if (msg.t === "move" && Number.isInteger(msg.i) && msg.i >= 0 && msg.i < s.n * s.n) {
        const next = place(s.board, s.n, s.seen, msg.i, s.turn);
        if (next) {
          s.board = next;
          s.seen.push(hash(next));
          s.last = msg.i;
          s.passes = 0;
          turnDone(s, now);
        }
      }
      if (msg.t === "pass") {
        s.last = -1;
        s.passes++;
        turnDone(s, now);
        if (s.passes >= 2) Object.assign(s, { phase: "score", turnEnds: null, dead: [], done: [] });
      }
    }
    if (s.phase === "score") {
      // แตะหมาก: สลับทั้งกลุ่มระหว่างตายกับไม่ตาย ทุกครั้งที่แก้ต้องกด Done ใหม่ทั้งคู่
      if (msg.t === "dead" && Number.isInteger(msg.i) && s.board[msg.i] && s.board[msg.i] !== ".") {
        const stones = group(s.board, s.n, msg.i).stones;
        s.dead = s.dead.includes(msg.i) ? s.dead.filter((k) => !stones.includes(k)) : [...s.dead, ...stones];
        s.done = [];
      }
      if (msg.t === "done" && !s.done.includes(id)) {
        s.done.push(id);
        if (s.done.length === 2) {
          const { points } = count(s.board, s.n, s.dead);
          const win = points.b > points.w ? "b" : "w";
          finish(s, idOf(s, win), "score", Math.abs(points.b - points.w));
        }
      }
      // ตกลงหมากตายกันไม่ได้ เล่นต่อ ฝ่ายที่ถึงตาเดินต่อ (คำสั่ง "resume" เป็นของการหยุดเกม จึงใช้ "play")
      if (msg.t === "play") Object.assign(s, { phase: "play", passes: 0, turnEnds: now + s.clock[s.turn], dead: [], done: [] });
    }
    if (msg.t === "resign") {
      if (s.phase === "play") s.clock[s.turn] = Math.max(0, s.turnEnds - now);
      finish(s, other(s, id), "resign");
    }
    if (id === s.owner) {
      if (msg.t === "size" && s.phase === "lobby" && SIZES.includes(Number(msg.value))) s.size = Number(msg.value);
      if (msg.t === "time" && s.phase === "lobby" && TIMES.includes(Number(msg.value))) s.time = Number(msg.value) * 60000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length === 2) start(s, now);
      if (msg.t === "newgame" && s.phase === "over") s.phase = "lobby";
    }
  },

  // อีกคนออก กลับไปรอคนใหม่ เริ่มนับคะแนนใหม่
  leave(s) {
    for (const p of s.players) p.score = 0;
    s.black = null;
    s.turnEnds = null;
    s.phase = "lobby";
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, size: s.size, time: s.time, komi: KOMI,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score, color: s.phase === "lobby" ? null : colorOf(s, p.id) })),
    };
    if (s.phase !== "lobby") {
      const mine = colorOf(s, id), myTurn = s.phase === "play" && s.turn === mine;
      Object.assign(v, {
        n: s.n, board: s.board, turn: s.turn, mine, myTurn, last: s.last,
        // จุดว่างที่วางไม่ได้ (ฆ่าตัวเองหรือติด Ko)
        bad: myTurn ? [...s.board].map((x, i) => (x === "." && !place(s.board, s.n, s.seen, i, mine) ? i : -1)).filter((i) => i >= 0) : [],
        result: s.result && { ...s.result, winner: pl(s, s.result.winner).name },
        // เวลาที่เหลือของแต่ละฝ่าย (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        clock: s.phase === "play" ? { ...s.clock, [s.turn]: Math.max(0, s.turnEnds - now) } : s.clock,
      });
      // ช่วงนับแต้ม และตอนจบเกมด้วยการนับแต้ม แสดงหมากตาย พื้นที่ และแต้ม
      if (s.phase === "score" || (s.result && s.result.reason === "score")) {
        Object.assign(v, count(s.board, s.n, s.dead), { dead: s.dead, done: s.done.map((x) => colorOf(s, x)) });
      }
    }
    return v;
  },
};
