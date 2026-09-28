// DOTS AND BOXES: 2-4 คน กระดานจุด size x size ช่อง ผลัดกันลากเส้นเชื่อมจุดที่ติดกันทีละเส้น
// ลากเส้นที่ 4 ของช่องไหนได้ช่องนั้น และต้องลากต่ออีกเส้น ครบทุกช่องจบเกม ได้ช่องมากสุดชนะ (เท่ากันชนะร่วม)
// เส้น: แนวนอน i = r * size + c (r = 0..size) ต่อด้วยแนวตั้ง H + r * (size + 1) + c (c = 0..size)
// ช่อง: i = r * size + c เก็บ id ของคนที่ได้
const pl = (s, id) => s.players.find((p) => p.id === id);
const TURN = 15000; // เวลาต่อเส้น (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ) หมดเวลาสุ่มลากให้
const COLORS = 4;

// ช่องที่อยู่ติดเส้น e และเส้นทั้ง 4 ด้านของช่อง
function boxesOf(n, e) {
  const H = (n + 1) * n;
  if (e < H) {
    const r = Math.floor(e / n), c = e % n;
    return [r > 0 && (r - 1) * n + c, r < n && r * n + c].filter((b) => b !== false);
  }
  const r = Math.floor((e - H) / (n + 1)), c = (e - H) % (n + 1);
  return [c > 0 && r * n + c - 1, c < n && r * n + c].filter((b) => b !== false);
}
function sides(n, b) {
  const H = (n + 1) * n, r = Math.floor(b / n), c = b % n;
  return [r * n + c, (r + 1) * n + c, H + r * (n + 1) + c, H + r * (n + 1) + c + 1];
}

function nextTurn(s) {
  s.turn = s.order[(s.order.indexOf(s.turn) + 1) % s.order.length];
}

function draw(s, id, e) {
  s.lines[e] = true;
  s.last = e;
  const got = boxesOf(s.n, e).filter((b) => sides(s.n, b).every((x) => s.lines[x]));
  for (const b of got) s.boxes[b] = id;
  s.got = got;
  if (s.boxes.every(Boolean)) finish(s);
  else if (!got.length) nextTurn(s);
}

function finish(s) {
  s.phase = "over";
  const count = (p) => s.boxes.filter((x) => x === p.id).length;
  const top = Math.max(...s.players.map(count));
  s.winners = s.players.filter((p) => count(p) === top).map((p) => p.name);
}

// ตาเปลี่ยน หรือลากเส้นใหม่ (ได้ช่องแล้วลากต่อ) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.turn, s.lines && s.lines.filter(Boolean).length].join();

export default {
  max: 4,
  init: () => ({ size: 5, time: TURN, phase: "lobby" }),
  // สีที่ยังไม่มีใครใช้
  player: (s) => ({ color: [...Array(COLORS).keys()].find((c) => !s.players.some((p) => p.color === c)) }),

  handle(s, id, msg, now) {
    const key = turnKey(s);
    const e = msg.e;
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && s.phase === "play" && now >= s.turnEnds) {
      const open = [...s.lines.keys()].filter((x) => !s.lines[x]);
      draw(s, s.turn, open[Math.floor(Math.random() * open.length)]);
    }
    if (msg.t === "line" && s.phase === "play" && s.turn === id && Number.isInteger(e) && e >= 0 && e < s.lines.length && !s.lines[e]) draw(s, id, e);
    if (id === s.owner) {
      if (msg.t === "size" && s.phase === "lobby") s.size = Math.min(8, Math.max(3, parseInt(msg.value) || 5));
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        const n = s.size;
        Object.assign(s, {
          phase: "play", n, order: s.players.map((p) => p.id), lines: Array(2 * n * (n + 1)).fill(false),
          boxes: Array(n * n).fill(null), turn: s.players[0].id, last: null, got: [], winners: [],
        });
      }
      if (msg.t === "newgame" && s.phase === "over") s.phase = "lobby";
    }
    if (turnKey(s) !== key) s.turnEnds = now + (s.time || TURN);
  },

  // คนออกกลางเกม: ช่องของเขาไม่นับ ถ้าถึงตาเขาส่งตาต่อ เหลือคนเดียวกลับไปรอ
  leave(s, id) {
    if (s.phase !== "play") return;
    const key = turnKey(s);
    if (s.players.length < 2) {
      s.phase = "lobby";
      return;
    }
    if (s.turn === id) nextTurn(s);
    s.order = s.order.filter((x) => x !== id);
    if (turnKey(s) !== key) s.turnEnds = Date.now() + (s.time || TURN);
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, size: s.size, time: s.time || TURN,
      players: s.players.map((p) => ({ id: p.id, name: p.name, color: p.color, score: s.boxes && s.phase !== "lobby" ? s.boxes.filter((x) => x === p.id).length : 0 })),
    };
    if (s.phase !== "lobby") {
      Object.assign(v, {
        n: s.n,
        lines: s.lines, last: s.last, got: s.got,
        // ช่องที่ได้: สีของเจ้าของ คนที่ออกไปแล้วเป็น -1
        boxes: s.boxes.map((x) => (x === null ? null : pl(s, x) ? pl(s, x).color : -1)),
        turn: s.turn, myTurn: s.phase === "play" && s.turn === id,
        winners: s.winners,
        // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      });
    }
    return v;
  },
};
