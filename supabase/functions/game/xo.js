// XO: 2 คน คนแรกในห้องเป็น X อีกคนเป็น O เล่นหลายรอบจนมีคนถึงเป้าหมาย
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const pl = (s, id) => s.players.find((p) => p.id === id);
const mark = (s, id) => (s.players[0].id === id ? "X" : "O");
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);
const TURN = 15000; // เวลาต่อตา (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ) หมดเวลาสุ่มลงช่องที่ว่าง

function startRound(s) {
  s.first = other(s, s.first);
  Object.assign(s, { phase: "play", board: Array(9).fill(null), turn: s.first, winner: null, line: [], ready: [] });
}

function move(s, id, i) {
  s.board[i] = mark(s, id);
  const line = LINES.find((l) => l.every((x) => s.board[x] === mark(s, id)));
  if (line) {
    s.phase = "end";
    s.winner = id;
    s.line = line;
    pl(s, id).score++;
    if (pl(s, id).score >= s.target) s.phase = "over";
  } else if (s.board.every(Boolean)) {
    s.phase = "end";
  } else {
    s.turn = other(s, id);
  }
}

// หมดเวลา: สุ่มลงช่องที่ว่างให้
function timeUp(s) {
  const empty = s.board.map((c, i) => (c ? null : i)).filter((i) => i !== null);
  move(s, s.turn, empty[Math.floor(Math.random() * empty.length)]);
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
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && s.phase === "play" && now >= s.turnEnds) timeUp(s);
    if (msg.t === "move" && s.phase === "play" && s.turn === id && s.board[msg.i] === null) move(s, id, msg.i);
    // ยอมแพ้: อีกคนชนะทั้งเกม
    if (msg.t === "resign") Object.assign(s, { phase: "over", winner: other(s, id), line: [] });
    if (msg.t === "ready" && s.phase === "end") {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length === 2) startRound(s);
    }
    if (id === s.owner) {
      if (msg.t === "target") s.target = Math.min(20, Math.max(1, Math.round(Number(msg.value)) || 3));
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
      players: s.players.map((p) => ({ name: p.name, score: p.score, mark: mark(s, p.id) })),
    };
    if (s.phase !== "lobby") {
      Object.assign(v, {
        board: s.board, line: s.line, myTurn: s.phase === "play" && s.turn === id,
        turnName: pl(s, s.turn).name, turnMark: mark(s, s.turn),
        winner: s.winner && pl(s, s.winner).name, won: s.winner === id, lost: !!s.winner && s.winner !== id,
        ready: s.ready.includes(id), readyCount: s.ready.length,
        // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
        turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      });
    }
    return v;
  },
};
