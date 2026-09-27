// POK DENG (ป๊อกเด้ง): ทุกคนเทียบไพ่กับเจ้ามือ แต้ม = หลักหน่วยของผลรวม (A = 1, 10 J Q K = 0)
// 2 ใบแรกได้ 8 หรือ 9 = ป๊อก เปิดทันที ไม่งั้นเลือกจั่วใบที่ 3 หรืออยู่ แล้วเจ้ามือเลือก จากนั้นเปิดเทียบ
// คนชนะได้เงินที่ลงคูณเด้งของไพ่คนชนะ (เงินไม่พอจ่ายเท่าที่มี) เงินหมดตกรอบ
// เจ้ามือเวียนไปทีละคน เหลือคนสุดท้ายหรือครบรอบตามที่ตั้ง เงินมากสุดชนะ
// ไพ่ 52 ใบ: r = 1-13 (A-K), s = ดอก 0 โพดำ 1 โพแดง 2 ข้าวหลามตัด 3 ดอกจิก
const pl = (s, id) => s.players.find((p) => p.id === id);
export const MONEY = [100, 500, 1000]; // เงินเริ่มต้นที่เลือกได้ ลงเงินทีละ 1/20 ของเงินเริ่มต้น
const TURN = 15000; // เวลาลงเงิน เวลาเลือกจั่วหรืออยู่ และเวลาของเจ้ามือ (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ)

function newDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ r, s, id: deck.length });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ค่าของไพ่ในมือ: kind (pok ป๊อก, tong ตอง, sf สเตรทฟลัช, run เรียง, sian เซียน, pts แต้มธรรมดา)
// deng = เด้ง (ตัวคูณเงิน), rank ไว้เทียบ มากกว่าชนะ เท่ากันเสมอ
// (หน้าเกมมีสำเนาไว้โชว์ ต้องแก้ให้ตรงกัน)
export function rate(cards) {
  const pts = cards.reduce((m, c) => m + (c.r < 10 ? c.r : 0), 0) % 10;
  const suited = cards.every((c) => c.s === cards[0].s);
  const r = cards.map((c) => c.r).sort((a, b) => a - b);
  if (cards.length === 2) {
    const deng = suited || r[0] === r[1] ? 2 : 1;
    return pts >= 8 ? { kind: "pok", pts, deng, rank: 100 + pts } : { kind: "pts", pts, deng, rank: pts };
  }
  // เรียง: 3 ใบติดกัน A ต่อหัวได้ (A 2 3) ต่อท้ายได้ (Q K A)
  const run = (r[1] === r[0] + 1 && r[2] === r[1] + 1) || r.join() === "1,12,13";
  if (r[0] === r[2]) return { kind: "tong", pts, deng: 5, rank: 50 };
  if (run && suited) return { kind: "sf", pts, deng: 5, rank: 40 };
  if (run) return { kind: "run", pts, deng: 3, rank: 30 };
  if (r[0] > 10) return { kind: "sian", pts, deng: 3, rank: 20 };
  return { kind: "pts", pts, deng: suited ? 3 : 1, rank: pts };
}

const players = (s) => s.order.filter((x) => x !== s.dealer).map((x) => pl(s, x));

// ลงเงิน: ไพ่รอบก่อนยังเปิดโชว์อยู่จนกว่าจะแจกใหม่
function startBet(s, dealer) {
  s.dealer = dealer;
  s.phase = "bet";
  for (const p of s.order.map((x) => pl(s, x))) p.bet = null;
}

// แจกคนละ 2 ใบ เริ่มจากคนถัดจากเจ้ามือ เจ้ามือได้ท้ายสุด
function deal(s) {
  s.deck = newDeck();
  const seats = [...s.order.slice(s.order.indexOf(s.dealer) + 1), ...s.order.slice(0, s.order.indexOf(s.dealer) + 1)].map((x) => pl(s, x));
  for (const p of seats) Object.assign(p, { cards: [], won: null, res: null, shown: false, done: false });
  for (let i = 0; i < 2; i++) for (const p of seats) p.cards.push(s.deck.pop());
  s.phase = "draw";
  s.dealt = s.dealer; // เจ้ามือของไพ่ที่อยู่บนโต๊ะ (ตอนลงเงินรอบต่อไป เจ้ามือเปลี่ยนแล้วแต่ไพ่รอบก่อนยังโชว์อยู่)
  s.inHand = [...s.order]; // คนที่ได้ไพ่รอบนี้ คนหมดตัวยังโชว์ไพ่ไว้จนแจกรอบใหม่
  s.log = { t: "deal", n: s.round };
  const d = pl(s, s.dealer);
  // เจ้ามือป๊อก: เปิดเทียบทุกคนทันที ไม่มีใครจั่ว
  if (rate(d.cards).kind === "pok") return showdown(s);
  // ผู้เล่นป๊อก: เปิดทันที ชนะเจ้ามือที่ไม่ป๊อก
  for (const p of players(s)) if (rate(p.cards).kind === "pok") settle(s, p);
  afterPlayers(s);
}

// เทียบกับเจ้ามือ จ่ายเงินที่ลงคูณเด้งของคนชนะ คนจ่ายเงินไม่พอจ่ายเท่าที่มี
// res: 1 ชนะ, -1 แพ้, 0 เสมอ (ชนะแต่เจ้ามือหมดตัวแล้วได้ 0 ก็ยังเป็น 1)
function settle(s, p) {
  const d = pl(s, s.dealer);
  const a = rate(p.cards), b = rate(d.cards);
  const res = Math.sign(a.rank - b.rank);
  const won = res > 0 ? Math.min(p.bet * a.deng, d.money) : res < 0 ? -Math.min(p.bet * b.deng, p.money) : 0;
  Object.assign(p, { won, res, shown: true, done: true });
  p.money += won;
  d.won = (d.won || 0) - won;
  d.money -= won;
}

// ผู้เล่นเลือกครบแล้ว ถึงตาเจ้ามือ (ถ้าทุกคนป๊อกไปแล้วก็จบรอบเลย)
function afterPlayers(s) {
  const ps = players(s);
  if (!ps.every((p) => p.done)) return;
  if (ps.every((p) => p.won !== null)) return endRound(s);
  s.phase = "dealer";
}

// เปิดเทียบ: เจ้ามือเก็บเงินคนแพ้ก่อน แล้วค่อยจ่ายคนชนะ
function showdown(s) {
  const d = rate(pl(s, s.dealer).cards).rank;
  const left = players(s).filter((p) => p.won === null);
  for (const p of left) if (rate(p.cards).rank < d) settle(s, p);
  for (const p of left) if (p.won === null) settle(s, p);
  endRound(s);
}

// เปิดไพ่ทุกคน คนเงินหมดตกรอบ เหลือคนเดียวหรือครบจำนวนรอบจบเกม ไม่งั้นลงเงินรอบต่อไป เจ้ามือเป็นคนถัดไปที่ยังไม่ตกรอบ
function endRound(s) {
  for (const x of s.order) pl(s, x).shown = true;
  const d = pl(s, s.dealer);
  d.won = d.won || 0;
  d.res = Math.sign(d.won);
  s.log.show = true;
  s.round++;
  s.deals[s.dealer] = (s.deals[s.dealer] || 0) + 1;
  const i = s.order.indexOf(s.dealer);
  const next = [...s.order.slice(i + 1), ...s.order.slice(0, i + 1)].find((x) => pl(s, x).money > 0);
  for (const x of s.order) if (!pl(s, x).money) pl(s, x).out = true;
  s.order = s.order.filter((x) => !pl(s, x).out);
  if (s.order.length < 2 || s.round >= s.rounds) finish(s);
  else startBet(s, next);
}

function finish(s) {
  const top = Math.max(...s.players.map((p) => p.money));
  s.phase = "over";
  s.winners = s.players.filter((p) => p.money === top).map((p) => p.name);
}

// หมดเวลา: คนที่ยังไม่ลงเงินลงขั้นต่ำ คนที่ยังไม่เลือกอยู่ (ไม่จั่ว)
function timeUp(s) {
  if (s.phase === "bet") {
    for (const p of players(s)) if (p.bet === null) p.bet = s.step;
    deal(s);
    s.log.late = true;
    return;
  }
  s.log = { t: "late", n: s.round };
  if (s.phase === "draw") {
    for (const p of players(s)) p.done = true;
    afterPlayers(s);
  } else showdown(s);
}

// ตาเปลี่ยน (ลงเงิน จั่วหรืออยู่ เจ้ามือ) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.round, s.dealer].join();
const timed = (s) => s.phase === "bet" || s.phase === "draw" || s.phase === "dealer";

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { cards: [], bet: null, won: null, res: null, shown: false, done: false, money: 0, out: false });
  s.order = [];
  s.phase = "lobby";
}

export default {
  max: 10,
  init: () => ({ laps: 2, money: 500, time: TURN, phase: "lobby" }),
  player: () => ({ cards: [], bet: null, won: null, res: null, shown: false, done: false, money: 0, out: false }),

  handle(s, id, msg, now) {
    const p = pl(s, id);
    const inRound = s.order && s.order.includes(id);
    const key = turnKey(s);
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && timed(s) && now >= s.turnEnds) timeUp(s);
    // ลงเงินทีละ step ไม่เกินเงินที่มี
    const n = msg.n;
    if (s.phase === "bet" && msg.t === "bet" && inRound && id !== s.dealer && p.bet === null && Number.isInteger(n) && n >= s.step && n <= p.money && n % s.step === 0) {
      p.bet = msg.n;
      s.log = { t: "bet", by: id, n: s.round };
      if (players(s).every((x) => x.bet !== null)) deal(s);
    } else if ((msg.t === "draw" || msg.t === "stay") && inRound) {
      const mine = s.phase === "draw" ? id !== s.dealer && !p.done : s.phase === "dealer" && id === s.dealer;
      if (mine) {
        if (msg.t === "draw") p.cards.push(s.deck.pop());
        s.log = { t: msg.t, by: id, n: s.round };
        p.done = true;
        if (s.phase === "draw") afterPlayers(s);
        else showdown(s);
      }
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "laps" && s.phase === "lobby") s.laps = Math.min(5, Math.max(1, Math.round(Number(msg.value)) || 2));
      if (msg.t === "money" && s.phase === "lobby" && MONEY.includes(Number(msg.value))) s.money = Number(msg.value);
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        toLobby(s);
        for (const x of s.players) x.money = s.money;
        s.order = s.players.map((x) => x.id);
        s.step = s.money / 20;
        s.rounds = s.laps * s.order.length;
        s.round = 0;
        s.deals = {}; // เป็นเจ้ามือไปแล้วกี่ครั้ง
        s.log = null;
        s.winners = null;
        s.inHand = null;
        startBet(s, s.order[0]);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
    if (turnKey(s) !== key) s.turnEnds = now + (s.time || TURN);
  },

  // คนออก: เล่นต่อกับคนที่เหลือ ตัดรอบที่เขายังต้องเป็นเจ้ามือออก
  // เจ้ามือออกกลางรอบ ยกเลิกรอบนั้นแล้วเริ่มรอบใหม่ให้คนถัดไปเป็นเจ้ามือ
  // ผู้เล่นออก: ไม่ต้องรอเขาลงเงินหรือเลือกแล้ว
  leave(s, id) {
    if (!s.order || !s.order.includes(id)) return;
    if (s.players.length < 2) return toLobby(s);
    const key = turnKey(s);
    const i = s.order.indexOf(id);
    s.order.splice(i, 1);
    if (s.phase === "lobby" || s.phase === "over") return;
    if (s.order.length < 2) return finish(s);
    s.rounds -= Math.max(0, s.laps - (s.deals[id] || 0));
    if (s.dealer === id) {
      for (const x of s.order) Object.assign(pl(s, x), { cards: [], won: null, res: null, shown: false, done: false });
      s.log = null;
      s.inHand = null;
      if (s.round >= s.rounds) return finish(s);
      startBet(s, s.order[i % s.order.length]);
    } else if (s.phase === "bet" && s.round >= s.rounds) return finish(s);
    else if (s.phase === "bet" && players(s).every((x) => x.bet !== null)) deal(s);
    else if (s.phase === "draw") afterPlayers(s);
    if (turnKey(s) !== key) s.turnEnds = Date.now() + (s.time || TURN);
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, laps: s.laps, money: s.money, time: s.time || TURN,
      players: s.players.map((p) => ({ id: p.id, name: p.name, money: p.money, out: p.out })),
    };
    if (s.phase === "lobby") return v;
    Object.assign(v, {
      dealer: s.dealer, dealt: s.dealt, round: s.round, rounds: s.rounds, step: s.step,
      // ไพ่คนอื่นเห็นแค่ด้านหลังจนกว่าจะเปิด
      seats: (s.inHand || s.order).filter((x) => pl(s, x)).map((x) => {
        const p = pl(s, x);
        const see = p.shown || x === id;
        return { id: x, name: p.name, money: p.money, bet: p.bet, n: p.cards.length, cards: see ? p.cards : null, rate: see && p.cards.length ? rate(p.cards) : null, done: p.done, won: p.won, res: p.res, out: p.out };
      }),
      log: s.log, winners: s.winners,
      // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
      turnLeft: timed(s) ? Math.max(0, s.turnEnds - now) : null,
    });
    return v;
  },
};
