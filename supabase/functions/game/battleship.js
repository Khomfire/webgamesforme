// BATTLESHIP: 2 คน กระดาน 10x10 เรือคนละ 5 ลำ วางแบบสุ่ม (กดสุ่มใหม่ได้) ผลัดกันยิงทีละนัด จมเรืออีกฝ่ายหมดก่อนชนะ
// ช่องเป็นเลข 0-99 (แถว x 10 + คอลัมน์)
const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2];
const pl = (s, id) => s.players.find((p) => p.id === id);
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);
const rand = (n) => Math.floor(Math.random() * n);

// วางเรือสุ่ม ไม่ทับและไม่ติดกัน (รวมแนวทแยง) จะได้เห็นชัดว่าลำไหนเป็นลำไหน เรือแต่ละลำคือรายการช่อง
function randomFleet() {
  const blocked = new Set();
  return FLEET.map((len) => {
    for (;;) {
      const down = Math.random() < 0.5;
      const r = rand(down ? SIZE - len + 1 : SIZE);
      const c = rand(down ? SIZE : SIZE - len + 1);
      const cells = Array.from({ length: len }, (_, k) => (down ? (r + k) * SIZE + c : r * SIZE + c + k));
      if (cells.some((i) => blocked.has(i))) continue;
      for (const i of cells) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const r2 = Math.floor(i / SIZE) + dr, c2 = (i % SIZE) + dc;
          if (r2 >= 0 && r2 < SIZE && c2 >= 0 && c2 < SIZE) blocked.add(r2 * SIZE + c2);
        }
      }
      return cells;
    }
  });
}

const sunk = (ship, shots) => ship.every((i) => shots.includes(i));
const afloat = (p, shots) => p.ships.filter((ship) => !sunk(ship, shots)).length;

// กระดานของ owner ที่ถูก shots ยิง: "" ว่าง, s เรือ, m พลาด, h โดน, x จม
// hide = กระดานอีกฝ่าย ไม่เห็นเรือที่ยังไม่โดน
function board(owner, shots, hide) {
  const b = Array(SIZE * SIZE).fill("");
  for (const ship of owner.ships) {
    const down = sunk(ship, shots);
    for (const i of ship) b[i] = down ? "x" : shots.includes(i) ? "h" : hide ? "" : "s";
  }
  for (const i of shots) if (!b[i]) b[i] = "m";
  return b;
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { ships: [], shots: [], ready: false });
  s.phase = "lobby";
}

export default {
  max: 2,
  init: () => ({ phase: "lobby" }),
  player: () => ({ ships: [], shots: [], ready: false }),

  handle(s, id, msg) {
    const me = pl(s, id);
    if (s.phase === "place" && !me.ready) {
      if (msg.t === "shuffle") me.ships = randomFleet();
      if (msg.t === "ready") {
        me.ready = true;
        if (s.players.every((p) => p.ready)) Object.assign(s, { phase: "play", turn: s.first, last: null });
      }
    }
    if (msg.t === "shoot" && s.phase === "play" && s.turn === id) {
      const i = Number(msg.i);
      if (!Number.isInteger(i) || i < 0 || i >= SIZE * SIZE || me.shots.includes(i)) return;
      me.shots.push(i);
      const foe = pl(s, other(s, id));
      const ship = foe.ships.find((x) => x.includes(i));
      s.last = { by: id, i, hit: !!ship, sunk: !!ship && sunk(ship, me.shots) };
      if (!afloat(foe, me.shots)) {
        s.phase = "over";
        s.winner = id;
      } else s.turn = foe.id;
    }
    if (id === s.owner) {
      if (msg.t === "start" && s.phase === "lobby" && s.players.length === 2) {
        s.first = s.first ? other(s, s.first) : s.owner; // สลับกันยิงก่อนทุกเกม
        for (const p of s.players) Object.assign(p, { ships: randomFleet(), shots: [], ready: false });
        s.phase = "place";
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
  },

  // อีกคนออก กลับไปรอคนใหม่
  leave(s) {
    s.first = null;
    toLobby(s);
  },

  view(s, id) {
    const me = pl(s, id);
    const foe = pl(s, other(s, id));
    const v = {
      screen: s.phase,
      players: s.players.map((p) => {
        const shots = (pl(s, other(s, p.id)) || { shots: [] }).shots;
        return { name: p.name, me: p.id === id, ready: p.ready, afloat: p.ships.length ? afloat(p, shots) : FLEET.length };
      }),
    };
    if (s.phase === "place") Object.assign(v, { mine: board(me, [], false), ready: me.ready });
    if (s.phase === "play" || s.phase === "over") {
      Object.assign(v, {
        mine: board(me, foe.shots, false),
        theirs: board(foe, me.shots, s.phase === "play"), // จบเกมแล้วเปิดเรือให้ดู
        foeName: foe.name,
        myTurn: s.phase === "play" && s.turn === id,
        turnName: pl(s, s.turn).name,
        last: s.last && { ...s.last, by: undefined, mine: s.last.by === id, name: pl(s, s.last.by).name, shots: me.shots.length + foe.shots.length },
        winner: s.winner && pl(s, s.winner).name, won: s.winner === id,
      });
    }
    return v;
  },
};
