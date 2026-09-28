// CONNECT FOUR: 2 คน กระดาน 7 คอลัมน์ 6 แถว คนแรกในห้องเป็นแดง อีกคนเป็นเหลือง
// ผลัดกันหยอดเหรียญลงคอลัมน์ เหรียญตกลงช่องว่างล่างสุด เรียง 4 ก่อน (แนวนอน ตั้ง หรือทแยง) ชนะรอบ เต็มกระดานเสมอ
// เล่นหลายรอบสลับกันเริ่ม จนมีคนถึงเป้าหมาย
// กระดาน: ช่อง i = แถว * 7 + คอลัมน์ แถว 0 อยู่บนสุด
const COLS = 7, ROWS = 6;
const pl = (s, id) => s.players.find((p) => p.id === id);
const color = (s, id) => (s.players[0].id === id ? "R" : "Y");
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);
const TURN = 15000; // เวลาต่อตา (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ) หมดเวลาสุ่มหยอดคอลัมน์ที่ยังไม่เต็ม

// ช่องที่เรียงติดกันกับช่อง i ในแนวเดียวกันตั้งแต่ 4 ช่องขึ้นไป (ไม่มีคืน [])
function line(board, i) {
  const r0 = Math.floor(i / COLS), c0 = i % COLS;
  const out = new Set();
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [i];
    for (const k of [1, -1]) {
      let r = r0 + dr * k, c = c0 + dc * k;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === board[i]) {
        cells.push(r * COLS + c);
        r += dr * k;
        c += dc * k;
      }
    }
    if (cells.length >= 4) cells.forEach((x) => out.add(x));
  }
  return [...out].sort((a, b) => a - b);
}

function startRound(s) {
  s.first = other(s, s.first);
  Object.assign(s, { phase: "play", board: Array(COLS * ROWS).fill(null), turn: s.first, last: null, winner: null, line: [], ready: [] });
}

function drop(s, id, c) {
  let r = ROWS - 1;
  while (s.board[r * COLS + c] !== null) r--;
  const i = r * COLS + c;
  s.board[i] = color(s, id);
  s.last = i;
  const won = line(s.board, i);
  if (won.length) {
    s.phase = "end";
    s.winner = id;
    s.line = won;
    pl(s, id).score++;
    if (pl(s, id).score >= s.target) s.phase = "over";
  } else if (s.board.every(Boolean)) {
    s.phase = "end";
  } else {
    s.turn = other(s, id);
  }
}

// หมดเวลา: สุ่มหยอดคอลัมน์ที่ยังไม่เต็มให้
function timeUp(s) {
  const open = [...Array(COLS).keys()].filter((c) => s.board[c] === null);
  drop(s, s.turn, open[Math.floor(Math.random() * open.length)]);
}

// ตาเปลี่ยน (หรือรอบใหม่) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.turn, s.board && s.board.filter(Boolean).length].join();

export default {
  max: 2,
  init: () => ({ target: 3, time: TURN, phase: "lobby" }),
  player: () => ({ score: 0 }),
  canResign: (s) => s.phase === "play" || s.phase === "end",

  handle(s, id, msg, now) {
    const key = turnKey(s);
    const c = msg.col;
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && s.phase === "play" && now >= s.turnEnds) timeUp(s);
    if (msg.t === "drop" && s.phase === "play" && s.turn === id && Number.isInteger(c) && c >= 0 && c < COLS && s.board[c] === null) drop(s, id, c);
    // ยอมแพ้: อีกคนชนะทั้งเกม
    if (msg.t === "resign") Object.assign(s, { phase: "over", winner: other(s, id), line: [] });
    if (msg.t === "ready" && s.phase === "end") {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length === 2) startRound(s);
    }
    if (id === s.owner) {
      if (msg.t === "target" && s.phase === "lobby") s.target = Math.min(20, Math.max(1, Math.round(Number(msg.value)) || 3));
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length === 2) {
        s.first = other(s, s.owner); // สลับตอนเริ่มรอบ เจ้าของห้องจึงได้เริ่มก่อน
        startRound(s);
      }
      if (msg.t === "newgame" && s.phase === "over") {
        for (const p of s.players) p.score = 0;
        s.phase = "lobby";
      }
    }
    if (turnKey(s) !== key) s.turnEnds = now + (s.time || TURN);
  },

  // อีกคนออก กลับไปรอคนใหม่ เริ่มนับคะแนนใหม่
  leave(s) {
    for (const p of s.players) p.score = 0;
    s.phase = "lobby";
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, target: s.target, time: s.time || TURN,
      players: s.players.map((p) => ({ name: p.name, score: p.score, color: color(s, p.id) })),
    };
    if (s.phase !== "lobby") {
      Object.assign(v, {
        board: s.board, last: s.last, line: s.line, myTurn: s.phase === "play" && s.turn === id, mine: color(s, id),
        turnName: pl(s, s.turn).name, turnColor: color(s, s.turn),
        winner: s.winner && pl(s, s.winner).name, won: s.winner === id, lost: !!s.winner && s.winner !== id,
        ready: s.ready.includes(id), readyCount: s.ready.length,
        // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      });
    }
    return v;
  },
};
