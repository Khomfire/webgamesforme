// CHESS: 2 คน กติกาสากล (FIDE) นาฬิกาฝ่ายละ X นาที เล่นหลายเกมสลับสีกัน ชนะได้ 1 เสมอได้คนละครึ่ง
// กระดาน: ช่อง i = แถว * 8 + คอลัมน์ แถว 0 คือ rank 8 (ฝั่ง Black) คอลัมน์ 0 คือ file a
// หมาก: ตัวใหญ่เป็น White ตัวเล็กเป็น Black P N B R Q K
// ตาเดิน: [from, to, promo] promo เป็นตัวใหญ่ N B R Q (มีเฉพาะตอน Pawn ถึงแถวสุดท้าย)
const pl = (s, id) => s.players.find((p) => p.id === id);
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);
const TIME = 600000; // เวลาฝ่ายละ (ค่าเริ่มต้น เจ้าของห้องตั้งได้)
const TIMES = [1, 3, 5, 10, 15, 30, 60];

const START = "rnbqkbnrpppppppp" + ".".repeat(32) + "PPPPPPPPRNBQKBNR";
const side = (x) => (x === x.toUpperCase() ? "w" : "b");
const rc = (i) => [i >> 3, i & 7];
const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK = KING.slice(0, 4), BISHOP = KING.slice(4);

// ช่อง i ถูกฝ่าย by โจมตีอยู่ไหม
function attacked(b, i, by) {
  const [r, c] = rc(i);
  const is = (rr, cc, types) => on(rr, cc) && b[rr * 8 + cc] !== "." && side(b[rr * 8 + cc]) === by && types.includes(b[rr * 8 + cc].toUpperCase());
  const dir = by === "w" ? 1 : -1; // Pawn ขาวอยู่แถวที่มากกว่า
  if (is(r + dir, c - 1, "P") || is(r + dir, c + 1, "P")) return true;
  if (KNIGHT.some(([dr, dc]) => is(r + dr, c + dc, "N"))) return true;
  if (KING.some(([dr, dc]) => is(r + dr, c + dc, "K"))) return true;
  for (const [dirs, types] of [[ROOK, "RQ"], [BISHOP, "BQ"]]) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (on(rr, cc) && b[rr * 8 + cc] === ".") { rr += dr; cc += dc; }
      if (is(rr, cc, types)) return true;
    }
  }
  return false;
}

const kingAt = (b, t) => b.indexOf(t === "w" ? "K" : "k");
const inCheck = (g) => attacked(g.board, kingAt(g.board, g.turn), g.turn === "w" ? "b" : "w");

// ตาเดินตามรูปหมาก ยังไม่เช็กว่า King ตัวเองโดนรุกหรือเปล่า
function pseudo(g) {
  const b = g.board, t = g.turn, foe = t === "w" ? "b" : "w", out = [];
  const empty = (r, c) => b[r * 8 + c] === ".";
  const enemy = (r, c) => b[r * 8 + c] !== "." && side(b[r * 8 + c]) === foe;
  for (let i = 0; i < 64; i++) {
    if (b[i] === "." || side(b[i]) !== t) continue;
    const [r, c] = rc(i), p = b[i].toUpperCase();
    const add = (rr, cc) => out.push([i, rr * 8 + cc]);
    if (p === "P") {
      const d = t === "w" ? -1 : 1, last = t === "w" ? 0 : 7;
      const push = (rr, cc) => (rr === last ? "NBRQ".split("").forEach((q) => out.push([i, rr * 8 + cc, q])) : add(rr, cc));
      if (on(r + d, c) && empty(r + d, c)) {
        push(r + d, c);
        if (r === (t === "w" ? 6 : 1) && empty(r + 2 * d, c)) add(r + 2 * d, c);
      }
      for (const dc of [-1, 1]) {
        if (!on(r + d, c + dc)) continue;
        if (enemy(r + d, c + dc)) push(r + d, c + dc);
        else if ((r + d) * 8 + c + dc === g.ep) add(r + d, c + dc);
      }
    } else if (p === "N" || p === "K") {
      for (const [dr, dc] of p === "N" ? KNIGHT : KING) if (on(r + dr, c + dc) && (empty(r + dr, c + dc) || enemy(r + dr, c + dc))) add(r + dr, c + dc);
    } else {
      for (const [dr, dc] of p === "R" ? ROOK : p === "B" ? BISHOP : KING) {
        let rr = r + dr, cc = c + dc;
        while (on(rr, cc) && empty(rr, cc)) { add(rr, cc); rr += dr; cc += dc; }
        if (on(rr, cc) && enemy(rr, cc)) add(rr, cc);
      }
    }
  }
  // Castling: King กับ Rook ยังไม่เคยเดิน ช่องระหว่างว่าง King ไม่โดนรุกและไม่ผ่านช่องที่โดนโจมตี
  const home = t === "w" ? 60 : 4;
  for (const [flag, rook, pass, gap] of [["K", 3, [1, 2], [1, 2]], ["Q", -4, [-1, -2], [-1, -2, -3]]]) {
    if (!g.castle.includes(t === "w" ? flag : flag.toLowerCase()) || b[home + rook] !== (t === "w" ? "R" : "r")) continue;
    if (gap.every((x) => b[home + x] === ".") && ![0, ...pass].some((x) => attacked(b, home + x, foe))) out.push([home, home + pass[1]]);
  }
  return out;
}

// เดินหมาก คืนตำแหน่งใหม่ (ไม่แก้ของเดิม)
function play(g, [from, to, promo]) {
  const b = g.board.split(""), p = b[from], t = g.turn, P = p.toUpperCase();
  const capture = b[to] !== "." || (P === "P" && to === g.ep);
  if (P === "P" && to === g.ep) b[to + (t === "w" ? 8 : -8)] = ".";
  if (P === "K" && Math.abs(to - from) === 2) {
    const [rf, rt] = to > from ? [from + 3, from + 1] : [from - 4, from - 1];
    b[rt] = b[rf];
    b[rf] = ".";
  }
  b[to] = promo ? (t === "w" ? promo : promo.toLowerCase()) : p;
  b[from] = ".";
  // สิทธิ์ Castling หายเมื่อ King หรือ Rook เดิน หรือ Rook โดนกิน
  const lost = { 60: "KQ", 4: "kq", 63: "K", 56: "Q", 7: "k", 0: "q" };
  const castle = g.castle.split("").filter((f) => !(lost[from] || "").includes(f) && !(lost[to] || "").includes(f)).join("");
  return {
    board: b.join(""), turn: t === "w" ? "b" : "w", castle,
    ep: P === "P" && Math.abs(to - from) === 16 ? (from + to) / 2 : null,
    half: P === "P" || capture ? 0 : g.half + 1,
  };
}

// ตาเดินที่ถูกกติกา: เดินแล้ว King ตัวเองต้องไม่โดนรุก
function legal(g) {
  return pseudo(g).filter((m) => {
    const n = play(g, m);
    return !attacked(n.board, kingAt(n.board, g.turn), n.turn);
  });
}

// ตำแหน่งซ้ำ: หมากเหมือนกัน ตาเดียวกัน สิทธิ์ Castling และ En passant ที่กินได้จริงเหมือนกัน
const posKey = (g, moves) => [g.board, g.turn, g.castle, moves.some((m) => m[1] === g.ep && g.board[m[0]].toUpperCase() === "P") ? g.ep : ""].join();

// หมากฝ่าย t ไม่พอ Checkmate: เหลือ King ตัวเดียว หรือ King กับ Knight / Bishop ตัวเดียว
function cannotMate(b, t) {
  const mine = b.split("").filter((x) => x !== "." && side(x) === t && x.toUpperCase() !== "K").map((x) => x.toUpperCase());
  return !mine.length || (mine.length === 1 && "NB".includes(mine[0]));
}
// ทั้งกระดานไม่มีใครรุกจนได้: K ปะทะ K, K กับหมากเบาตัวเดียว หรือเหลือแต่ Bishop ที่อยู่ช่องสีเดียวกันหมด
function deadDraw(b) {
  const rest = [...b].map((x, i) => [x.toUpperCase(), i]).filter(([x]) => x !== "." && x !== "K");
  if (rest.length <= 1 && rest.every(([x]) => "NB".includes(x))) return true;
  return rest.every(([x]) => x === "B") && new Set(rest.map(([, i]) => ((i >> 3) + (i & 7)) % 2)).size === 1;
}

function finish(s, winner, reason) {
  s.phase = "over";
  s.result = { winner, reason };
  if (winner) pl(s, winner).score += 1;
  else for (const p of s.players) p.score += 0.5;
  s.offer = null;
}

const idOf = (s, t) => (t === "w" ? s.white : other(s, s.white));
const colorOf = (s, id) => (id === s.white ? "w" : "b");

function move(s, m, now) {
  const g = s.pos, mover = g.turn;
  s.clock[mover] = s.turnEnds - now;
  const n = play(g, m);
  s.pos = n;
  s.last = [m[0], m[1]];
  if (s.offer && s.offer !== idOf(s, mover)) s.offer = null; // เดินแทนการตอบรับ = ไม่เสมอ
  s.moves = legal(n);
  const key = posKey(n, s.moves);
  s.seen[key] = (s.seen[key] || 0) + 1;
  s.check = inCheck(n);
  s.turnEnds = now + s.clock[n.turn];
  if (!s.moves.length) finish(s, s.check ? idOf(s, mover) : null, s.check ? "checkmate" : "stalemate");
  else if (deadDraw(n.board)) finish(s, null, "material");
  else if (s.seen[key] >= 3) finish(s, null, "repetition");
  else if (n.half >= 100) finish(s, null, "fifty");
}

function start(s, now) {
  // เกมแรกเจ้าของห้องเป็น White เกมต่อไปสลับสี
  s.white = s.white && s.players.some((p) => p.id === s.white) ? other(s, s.white) : s.owner;
  const g = { board: START, turn: "w", castle: "KQkq", ep: null, half: 0 };
  Object.assign(s, {
    phase: "play", pos: g, moves: legal(g), seen: { [posKey(g, [])]: 1 }, check: false, last: null,
    clock: { w: s.time, b: s.time }, turnEnds: now + s.time, offer: null, result: null,
  });
}

export default {
  max: 2,
  init: () => ({ time: TIME, phase: "lobby" }),
  player: () => ({ score: 0 }),

  handle(s, id, msg, now) {
    const mine = s.phase === "play" && idOf(s, s.pos.turn) === id;
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง อีกฝ่ายหมากไม่พอ Checkmate ก็เสมอ
    if (s.phase === "play" && now >= s.turnEnds && (msg.t === "timeout" || msg.t === "move")) {
      const t = s.pos.turn, foe = t === "w" ? "b" : "w";
      s.clock[t] = 0;
      finish(s, cannotMate(s.pos.board, foe) ? null : idOf(s, foe), "time");
      return;
    }
    if (msg.t === "move" && mine) {
      const m = s.moves.find(([f, t, q]) => f === msg.from && t === msg.to && (q || null) === (msg.promo || null));
      if (m) move(s, m, now);
    }
    if (s.phase === "play") {
      if (msg.t === "resign") finish(s, other(s, id), "resign");
      // ขอเสมอ: อีกฝ่ายขออยู่แล้วก็เสมอเลย
      if (msg.t === "draw") {
        if (s.offer && s.offer !== id) finish(s, null, "agreement");
        else s.offer = id;
      }
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby" && TIMES.includes(Number(msg.value))) s.time = Number(msg.value) * 60000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length === 2) start(s, now);
      if (msg.t === "newgame" && s.phase === "over") s.phase = "lobby";
    }
  },

  // อีกคนออก กลับไปรอคนใหม่ เริ่มนับคะแนนใหม่
  leave(s) {
    for (const p of s.players) p.score = 0;
    s.white = null;
    s.phase = "lobby";
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, time: s.time,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score, color: s.phase === "lobby" ? null : colorOf(s, p.id) })),
    };
    if (s.phase !== "lobby") {
      const g = s.pos, myTurn = s.phase === "play" && idOf(s, g.turn) === id;
      Object.assign(v, {
        board: g.board, turn: g.turn, mine: colorOf(s, id), myTurn, last: s.last,
        check: s.check ? kingAt(g.board, g.turn) : null,
        moves: myTurn ? s.moves : [],
        offer: s.offer ? (s.offer === id ? "me" : "them") : null,
        result: s.result && { ...s.result, winner: s.result.winner && pl(s, s.result.winner).name },
        // เวลาที่เหลือของแต่ละฝ่าย (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        clock: s.phase === "play" ? { ...s.clock, [g.turn]: Math.max(0, s.turnEnds - now) } : s.clock,
      });
    }
    return v;
  },
};
