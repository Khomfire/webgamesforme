// SPLENDOR: การ์ด 3 ระดับ (40/30/20 ใบ) เปิดระดับละ 4 ใบ เพชร 5 สี (2 คนสีละ 4, 3 คนสีละ 5, 4 คนสีละ 7) กับทอง 5 เหรียญ
// ขุนนางเปิด (จำนวนคน + 1) ใบ ตาละหนึ่งอย่าง: หยิบเพชร 3 สีไม่ซ้ำ / หยิบสีเดียว 2 เหรียญ (กองนั้นต้องมีอย่างน้อย 4)
// / จองการ์ด (บนโต๊ะหรือบนกองคว่ำ จองได้ไม่เกิน 3 ใบ ได้ทอง 1) / ซื้อการ์ดบนโต๊ะหรือที่จองไว้
// การ์ดที่ซื้อเป็นส่วนลดถาวรของสีนั้น ทองใช้แทนสีไหนก็ได้ ถือเพชรเกิน 10 ต้องคืน ส่วนลดครบตามขุนนาง ขุนนางมาหา (ตาละใบ)
// มีคนถึง 15 แต้ม เล่นจนครบรอบ (คนก่อนคนเริ่มเล่นเป็นคนสุดท้าย) แต้มมากสุดชนะ เสมอกันการ์ดน้อยกว่าชนะ
// สีเรียงเป็น w ขาว u น้ำเงิน g เขียว r แดง k ดำ y ทอง
export const COLORS = ["w", "u", "g", "r", "k"];

// ชุดการ์ดมาตรฐาน: สีส่วนลด แต้ม . ราคา w u g r k
const DECK = [
  "k0.11110 k0.12110 k0.22010 k0.00131 k0.00210 k0.20200 k0.00300 k1.04000 u0.10111 u0.10121 u0.10220 u0.01310 u0.10002 u0.00202 u0.00003 u1.00040 w0.01111 w0.01211 w0.02201 w0.31001 w0.00021 w0.02002 w0.03000 w1.00400 g0.11011 g0.11012 g0.01022 g0.13100 g0.21000 g0.02020 g0.00030 g1.00004 r0.11101 r0.21101 r0.20102 r0.10013 r0.02100 r0.20020 r0.30000 r1.40000",
  "k1.32200 k1.30302 k2.01420 k2.00530 k2.50000 k3.00006 u1.02230 u1.02303 u2.53000 u2.20014 u2.05000 u3.06000 w1.00322 w1.23030 w2.00142 w2.00053 w2.00050 w3.60000 g1.30230 g1.23002 g2.42001 g2.05300 g2.00500 g3.00600 r1.20023 r1.03023 r2.14200 r2.30005 r2.00005 r3.00060",
  "k3.33530 k4.00070 k4.00363 k5.00073 u3.30335 u4.70000 u4.63003 u5.73000 w3.03353 w4.00007 w4.30036 w5.30007 g3.53033 g4.07000 g4.36300 g5.07300 r3.35303 r4.00700 r4.03630 r5.00730",
];
export const CARDS = DECK.flatMap((row, l) => row.split(" ").map((s) => ({ l: l + 1, b: s[0], p: Number(s[1]), c: [...s.slice(3)].map(Number) })));
CARDS.forEach((c, i) => (c.id = i));
// ขุนนาง (3 แต้ม): ส่วนลดที่ต้องมี w u g r k
export const NOBLES = ["04400", "40004", "03330", "00440", "00044", "30033", "44000", "00333", "33300", "33003"].map((s) => [...s].map(Number));

const WIN = 15;
const pl = (s, id) => s.players.find((p) => p.id === id);
const gemCount = (p) => Object.values(p.gems).reduce((m, n) => m + n, 0);
const bonus = (p) => COLORS.map((c) => p.cards.filter((id) => CARDS[id].b === c).length);
export const points = (p) => p.cards.reduce((m, id) => m + CARDS[id].p, 0) + p.nobles.length * 3;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ทองที่ต้องใช้ซื้อการ์ดใบนี้ (จ่ายเพชรสีตรงก่อน ขาดเท่าไรใช้ทอง) ซื้อไม่ได้คืน -1
export function goldNeeded(p, card) {
  const bon = bonus(p);
  const need = COLORS.reduce((m, c, i) => m + Math.max(0, card.c[i] - bon[i] - p.gems[c]), 0);
  return need <= p.gems.y ? need : -1;
}

const emptyGems = () => ({ w: 0, u: 0, g: 0, r: 0, k: 0, y: 0 });

function refill(s, l) {
  const row = s.market[l - 1];
  for (let i = 0; i < 4; i++) if (row[i] === null && s.decks[l - 1].length) row[i] = s.decks[l - 1].pop();
}

// หยิบเพชร: 3 สีไม่ซ้ำ (ถ้ากองที่เหลือมีไม่ถึง 3 สี หยิบทุกสีที่มี) หรือสีเดียว 2 เหรียญจากกองที่มีอย่างน้อย 4
export function canTake(bank, gems) {
  if (!Array.isArray(gems) || !gems.every((c) => COLORS.includes(c))) return false;
  if (gems.length === 2 && gems[0] === gems[1]) return bank[gems[0]] >= 4;
  const left = COLORS.filter((c) => bank[c] > 0).length;
  return gems.length === Math.min(3, left) && gems.length > 0 && new Set(gems).size === gems.length && gems.every((c) => bank[c] > 0);
}

function take(s, p, gems) {
  for (const c of gems) { s.bank[c]--; p.gems[c]++; }
  s.log = { t: "take", by: p.id, gems };
  afterAction(s, p);
}

// จอง: การ์ดบนโต๊ะ (card) หรือใบบนสุดของกองระดับ l (คนอื่นไม่เห็น) ได้ทองถ้ายังมี
function reserve(s, p, card, l) {
  let id;
  if (card !== undefined) {
    const row = s.market[CARDS[card].l - 1];
    row[row.indexOf(card)] = null;
    refill(s, CARDS[card].l);
    id = card;
  } else id = s.decks[l - 1].pop();
  p.reserved.push({ id, hidden: card === undefined });
  const gold = s.bank.y > 0;
  if (gold) { s.bank.y--; p.gems.y++; }
  s.log = { t: "reserve", by: p.id, card: card === undefined ? null : card, l: CARDS[id].l, gold };
  afterAction(s, p);
}

function buy(s, p, id) {
  const card = CARDS[id], bon = bonus(p);
  COLORS.forEach((c, i) => {
    const pay = Math.min(p.gems[c], Math.max(0, card.c[i] - bon[i]));
    const gold = Math.max(0, card.c[i] - bon[i]) - pay;
    p.gems[c] -= pay; s.bank[c] += pay;
    p.gems.y -= gold; s.bank.y += gold;
  });
  const r = p.reserved.findIndex((x) => x.id === id);
  if (r >= 0) p.reserved.splice(r, 1);
  else {
    const row = s.market[card.l - 1];
    row[row.indexOf(id)] = null;
    refill(s, card.l);
  }
  p.cards.push(id);
  s.log = { t: "buy", by: p.id, card: id };
  afterAction(s, p);
}

// หลังทำตา: เพชรเกิน 10 ต้องคืนก่อน แล้วดูขุนนาง ได้หลายใบให้เลือกเอง
function afterAction(s, p) {
  if (gemCount(p) > 10) return (s.stage = "discard");
  const ok = s.nobles.filter((n) => NOBLES[n].every((x, i) => bonus(p)[i] >= x));
  if (ok.length > 1) return (s.stage = "noble");
  if (ok.length) visit(s, p, ok[0]);
  endTurn(s, p);
}

function visit(s, p, n) {
  s.nobles = s.nobles.filter((x) => x !== n);
  p.nobles.push(n);
  s.log.noble = n;
}

const step = (s, from) => s.order[(s.order.indexOf(from) + 1) % s.order.length];

// ถึง 15 แต้มแล้วเล่นจนครบรอบ: ตาถัดไปกลับมาที่คนเริ่มเมื่อไรจบเกม
function endTurn(s, p) {
  s.stage = "act";
  if (points(p) >= WIN) s.final = true;
  const next = step(s, p.id);
  if (s.final && next === s.first) return finish(s);
  s.turn = next;
}

function finish(s) {
  const rank = (p) => points(p) * 100 - p.cards.length;
  const ps = s.order.map((id) => pl(s, id));
  const top = Math.max(...ps.map(rank));
  s.phase = "over";
  s.turn = null;
  s.winner = ps.filter((p) => rank(p) === top).map((p) => p.name).join(", ");
}

// คืนเพชรที่เกิน: คนหมดเวลาคืนสีที่ถือเยอะสุดก่อน
function discard(s, p, gems) {
  for (const c of gems) { p.gems[c]--; s.bank[c]++; }
  s.log.back = gems;
  s.stage = "act";
  afterAction(s, p);
}
function autoDiscard(p) {
  const out = [], g = { ...p.gems };
  while (gemCount(p) - out.length > 10) {
    const c = [...COLORS, "y"].reduce((m, x) => (g[x] > g[m] ? x : m));
    g[c]--;
    out.push(c);
  }
  return out;
}

// ไม่มีอะไรทำได้เลย (ไม่มีเพชรให้หยิบ จองเต็ม ซื้อไม่ได้) ผ่านได้
const stuck = (s, p) =>
  !COLORS.some((c) => s.bank[c] > 0) &&
  (p.reserved.length >= 3 || !s.market.some((row, l) => row.some((x) => x !== null) || s.decks[l].length)) &&
  ![...s.market.flat().filter((x) => x !== null), ...p.reserved.map((x) => x.id)].some((id) => goldNeeded(p, CARDS[id]) >= 0);

// หมดเวลา: ตาปกติข้ามไป คืนเพชรคืนสีที่ถือเยอะสุด เลือกขุนนางได้ใบแรก
function timeUp(s) {
  const p = pl(s, s.turn);
  if (s.stage === "discard") discard(s, p, autoDiscard(p));
  else if (s.stage === "noble") {
    visit(s, p, s.nobles.find((n) => NOBLES[n].every((x, i) => bonus(p)[i] >= x)));
    endTurn(s, p);
  } else {
    s.log = { t: "skip", by: p.id };
    endTurn(s, p);
  }
  s.log.late = p.id;
}

// เอาออกจากเกม (ออกจากห้องหรือยอมแพ้): เพชรคืนกอง การ์ดที่จองทิ้งไป ถ้าเป็นตาเขาไปคนถัดไป เหลือคนเดียวชนะ
function drop(s, id, p) {
  const next = step(s, id);
  for (const c of [...COLORS, "y"]) { s.bank[c] += p.gems[c]; p.gems[c] = 0; }
  p.reserved = [];
  if (s.first === id) s.first = next;
  s.order = s.order.filter((x) => x !== id);
  if (s.order.length < 2) {
    s.phase = "over";
    s.turn = null;
    s.winner = pl(s, s.order[0]).name;
    return;
  }
  if (s.turn === id) {
    s.stage = "act";
    if (s.final && next === s.first) return finish(s);
    s.turn = next;
  }
}

function start(s) {
  const n = s.players.length, each = n === 2 ? 4 : n === 3 ? 5 : 7;
  for (const p of s.players) Object.assign(p, { gems: emptyGems(), cards: [], reserved: [], nobles: [] });
  const decks = [1, 2, 3].map((l) => shuffle(CARDS.filter((c) => c.l === l).map((c) => c.id)));
  Object.assign(s, {
    phase: "play", stage: "act", final: false, winner: null, log: null,
    bank: { w: each, u: each, g: each, r: each, k: each, y: 5 },
    decks, market: decks.map((d) => d.splice(-4).reverse()),
    nobles: shuffle(NOBLES.map((_, i) => i)).slice(0, n + 1),
    order: shuffle(s.players.map((p) => p.id)),
  });
  s.first = s.turn = s.order[0];
}

// ทำตา จอง ซื้อ หรือตาเปลี่ยน เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.turn, s.stage, JSON.stringify(s.log)].join();

export default {
  max: 4,
  init: () => ({ time: 60000, phase: "lobby" }),
  player: () => ({ gems: emptyGems(), cards: [], reserved: [], nobles: [] }),
  canResign: (s, id) => s.phase === "play" && s.order.includes(id),

  handle(s, id, msg, now) {
    const key = turnKey(s);
    const p = pl(s, id);
    if (msg.t === "resign") drop(s, id, p);
    if (s.phase === "play") {
      // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
      if (msg.t === "timeout" && now >= s.turnEnds) timeUp(s);
      else if (s.turn === id && s.stage === "act") {
        const id2 = Number.isInteger(msg.card) && CARDS[msg.card] ? msg.card : undefined;
        const onTable = id2 !== undefined && s.market[CARDS[id2].l - 1].includes(id2);
        const mine = id2 !== undefined && p.reserved.some((x) => x.id === id2);
        if (msg.t === "take" && canTake(s.bank, msg.gems)) take(s, p, msg.gems);
        if (msg.t === "reserve" && p.reserved.length < 3) {
          if (onTable) reserve(s, p, id2);
          else if ([1, 2, 3].includes(msg.l) && s.decks[msg.l - 1].length) reserve(s, p, undefined, msg.l);
        }
        if (msg.t === "buy" && (onTable || mine) && goldNeeded(p, CARDS[id2]) >= 0) buy(s, p, id2);
        if (msg.t === "pass" && stuck(s, p)) {
          s.log = { t: "skip", by: p.id };
          endTurn(s, p);
        }
      } else if (s.turn === id && s.stage === "discard" && Array.isArray(msg.gems)) {
        const back = emptyGems();
        const ok = msg.gems.every((c) => Object.hasOwn(back, c) && ++back[c] <= p.gems[c]);
        if (msg.t === "discard" && ok && msg.gems.length === gemCount(p) - 10) discard(s, p, msg.gems);
      } else if (s.turn === id && s.stage === "noble" && msg.t === "noble" && s.nobles.includes(msg.noble)) {
        if (NOBLES[msg.noble].every((x, i) => bonus(p)[i] >= x)) {
          visit(s, p, msg.noble);
          endTurn(s, p);
        }
      }
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(180, Math.max(30, Math.round(Number(msg.value)) || 60)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) start(s);
      if (msg.t === "newgame" && s.phase === "over") s.phase = "lobby";
    }
    if (turnKey(s) !== key) s.turnEnds = now + s.time;
  },

  // คนออก
  leave(s, id, gone) {
    if (s.phase !== "play" || !s.order.includes(id)) return;
    const key = turnKey(s);
    drop(s, id, gone);
    if (turnKey(s) !== key) s.turnEnds = Date.now() + s.time;
  },

  view(s, id, now) {
    const v = { screen: s.phase, time: s.time, players: s.players.map((p) => ({ id: p.id, name: p.name })) };
    if (s.phase === "lobby") return v;
    const card = (x) => CARDS[x];
    const seat = (p) => ({
      id: p.id, name: p.name, gems: p.gems, bonus: bonus(p), points: points(p), cards: p.cards.length, nobles: p.nobles,
      // การ์ดที่จองจากกองคว่ำ คนอื่นเห็นแค่ระดับ
      reserved: p.reserved.map((r) => (p.id === id || !r.hidden ? card(r.id) : { l: CARDS[r.id].l })),
    });
    const me = pl(s, id);
    const myTurn = s.phase === "play" && s.turn === id;
    Object.assign(v, {
      seats: s.order.map((x) => seat(pl(s, x))),
      // คนที่ออกไปแล้วยังอยู่ในตารางแต้มตอนจบ
      out: s.players.filter((p) => !s.order.includes(p.id)).map((p) => ({ name: p.name })),
      bank: s.bank, market: s.market.map((row) => row.map((x) => (x === null ? null : card(x)))), decks: s.decks.map((d) => d.length),
      nobles: s.nobles.map((n) => ({ id: n, need: NOBLES[n] })),
      turn: s.turn, stage: s.stage, myTurn, final: s.final, winner: s.winner,
      log: s.log && { ...s.log, card: typeof s.log.card === "number" ? card(s.log.card) : null },
      discard: myTurn && s.stage === "discard" ? gemCount(me) - 10 : 0,
      choose: myTurn && s.stage === "noble" ? s.nobles.filter((n) => NOBLES[n].every((x, i) => bonus(me)[i] >= x)) : [],
      canPass: myTurn && s.stage === "act" && stuck(s, me),
      // เวลาที่เหลือของตานี้ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
      turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
    });
    return v;
  },
};
