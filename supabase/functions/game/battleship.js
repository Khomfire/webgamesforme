// BATTLESHIP: 2 คน กระดาน 10x10 เรือคนละ 5 ลำ วางเอง (ไม่ติดกัน) ยิงทีละนัด โดนยิงต่อ พลาดเปลี่ยนตา จมเรืออีกฝ่ายหมดก่อนชนะ
// ช่องเป็นเลข 0-99 (แถว x 10 + คอลัมน์) เรือแต่ละลำคือรายการช่องเรียงจากน้อยไปมาก
const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2];
const pl = (s, id) => s.players.find((p) => p.id === id);
const other = (s, id) => s.players.map((p) => p.id).find((x) => x !== id);

// เรือที่หน้าเกมส่งมาตอนกดพร้อม: ครบทุกลำตามความยาว เป็นเส้นตรงติดกันในกระดาน ไม่ทับและไม่ติดกัน (รวมแนวทแยง)
// (หน้าเกมมีสำเนาเงื่อนไขไม่ติดกันไว้ตอนวาง ต้องแก้ให้ตรงกัน)
function validFleet(ships) {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) return null;
  const fleet = ships.map((ship) => (Array.isArray(ship) ? [...ship].sort((a, b) => a - b) : []));
  const lens = fleet.map((ship) => ship.length).sort((a, b) => b - a);
  if (lens.join() !== FLEET.join()) return null;
  for (const ship of fleet) {
    if (!ship.every((i) => Number.isInteger(i) && i >= 0 && i < SIZE * SIZE)) return null;
    const step = ship[1] - ship[0];
    if (step !== 1 && step !== SIZE) return null;
    if (!ship.every((i, k) => i === ship[0] + k * step)) return null;
    if (step === 1 && Math.floor(ship[0] / SIZE) !== Math.floor(ship.at(-1) / SIZE)) return null; // ห้ามขึ้นแถวใหม่
  }
  const near = (a, b) => Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) <= 1 && Math.abs((a % SIZE) - (b % SIZE)) <= 1;
  for (let a = 0; a < fleet.length; a++)
    for (let b = a + 1; b < fleet.length; b++)
      if (fleet[a].some((x) => fleet[b].some((y) => near(x, y)))) return null;
  return fleet;
}

const sunk = (ship, shots) => ship.every((i) => shots.includes(i));
const afloat = (p, shots) => p.ships.filter((ship) => !sunk(ship, shots)).length;

// เครื่องหมายบนกระดานของ owner ที่ถูก shots ยิง: "" ยังไม่ยิง, m พลาด, h โดน, x โดนและจมแล้ว
function marks(owner, shots) {
  const b = Array(SIZE * SIZE).fill("");
  for (const i of shots) b[i] = "m";
  for (const ship of owner.ships) {
    const down = sunk(ship, shots);
    for (const i of ship) if (shots.includes(i)) b[i] = down ? "x" : "h";
  }
  return b;
}
// เรือไว้วาดรูป: all = เห็นทุกลำ (เรือตัวเอง หรืออีกฝ่ายตอนจบเกม) ไม่งั้นเห็นแค่ลำที่จมแล้ว
const fleet = (owner, shots, all) =>
  owner.ships.map((cells) => ({ cells, sunk: sunk(cells, shots) })).filter((ship) => all || ship.sunk);

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
    if (msg.t === "ready" && s.phase === "place" && !me.ready) {
      const ships = validFleet(msg.ships);
      if (!ships) return;
      Object.assign(me, { ships, ready: true });
      if (s.players.every((p) => p.ready)) Object.assign(s, { phase: "play", turn: s.first, last: null });
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
      } else if (!ship) s.turn = foe.id; // โดนได้ยิงต่อ
    }
    if (id === s.owner) {
      if (msg.t === "start" && s.phase === "lobby" && s.players.length === 2) {
        s.first = s.first ? other(s, s.first) : s.owner; // สลับกันยิงก่อนทุกเกม
        for (const p of s.players) Object.assign(p, { ships: [], shots: [], ready: false });
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
    if (s.phase === "place") Object.assign(v, { ready: me.ready, myFleet: fleet(me, [], true) });
    if (s.phase === "play" || s.phase === "over") {
      Object.assign(v, {
        mine: marks(me, foe.shots),
        theirs: marks(foe, me.shots),
        myFleet: fleet(me, foe.shots, true),
        theirFleet: fleet(foe, me.shots, s.phase === "over"), // จบเกมแล้วเปิดเรือให้ดู
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
