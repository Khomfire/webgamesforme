// POK DENG (ป๊อกเด้ง): ทุกคนเทียบไพ่กับเจ้ามือ แต้ม = หลักหน่วยของผลรวม (A = 1, 10 J Q K = 0)
// 2 ใบแรกได้ 8 หรือ 9 = ป๊อก เปิดทันที ไม่งั้นเลือกจั่วใบที่ 3 หรืออยู่ แล้วเจ้ามือเลือก จากนั้นเปิดเทียบ
// คนชนะได้เงินที่ลงคูณเด้งของไพ่คนชนะ เจ้ามือเวียนไปทีละคนจนครบตามที่ตั้ง เงินมากสุดชนะ
// ไพ่ 52 ใบ: r = 1-13 (A-K), s = ดอก 0 โพดำ 1 โพแดง 2 ข้าวหลามตัด 3 ดอกจิก
const pl = (s, id) => s.players.find((p) => p.id === id);
export const BETS = [10, 20, 50, 100];

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
const step = (s, from) => s.order[(s.order.indexOf(from) + 1) % s.order.length];

// ลงเงิน: เจ้ามือเวียนไปคนถัดไป ไพ่รอบก่อนยังเปิดโชว์อยู่จนกว่าจะแจกใหม่
function startBet(s) {
  s.dealer = s.dealer ? step(s, s.dealer) : s.order[0];
  s.phase = "bet";
  for (const p of s.order.map((x) => pl(s, x))) p.bet = null;
}

// แจกคนละ 2 ใบ เริ่มจากคนถัดจากเจ้ามือ เจ้ามือได้ท้ายสุด
function deal(s) {
  s.deck = newDeck();
  const seats = [...s.order.slice(s.order.indexOf(s.dealer) + 1), ...s.order.slice(0, s.order.indexOf(s.dealer) + 1)].map((x) => pl(s, x));
  for (const p of seats) Object.assign(p, { cards: [], won: null, shown: false, done: false });
  for (let i = 0; i < 2; i++) for (const p of seats) p.cards.push(s.deck.pop());
  s.phase = "draw";
  s.dealt = s.dealer; // เจ้ามือของไพ่ที่อยู่บนโต๊ะ (ตอนลงเงินรอบต่อไป เจ้ามือเปลี่ยนแล้วแต่ไพ่รอบก่อนยังโชว์อยู่)
  s.log = { t: "deal", n: s.round };
  const d = pl(s, s.dealer);
  // เจ้ามือป๊อก: เปิดเทียบทุกคนทันที ไม่มีใครจั่ว
  if (rate(d.cards).kind === "pok") return showdown(s);
  // ผู้เล่นป๊อก: เปิดทันที ชนะเจ้ามือที่ไม่ป๊อก
  for (const p of players(s)) if (rate(p.cards).kind === "pok") settle(s, p);
  afterPlayers(s);
}

// เทียบกับเจ้ามือ จ่ายเงินที่ลงคูณเด้งของคนชนะ
function settle(s, p) {
  const d = pl(s, s.dealer);
  const a = rate(p.cards), b = rate(d.cards);
  const won = a.rank > b.rank ? p.bet * a.deng : a.rank < b.rank ? -p.bet * b.deng : 0;
  Object.assign(p, { won, shown: true, done: true });
  p.score += won;
  d.won = (d.won || 0) - won;
  d.score -= won;
}

// ผู้เล่นเลือกครบแล้ว ถึงตาเจ้ามือ (ถ้าทุกคนป๊อกไปแล้วก็จบรอบเลย)
function afterPlayers(s) {
  const ps = players(s);
  if (!ps.every((p) => p.done)) return;
  if (ps.every((p) => p.won !== null)) return endRound(s);
  s.phase = "dealer";
}

function showdown(s) {
  for (const p of players(s)) if (p.won === null) settle(s, p);
  endRound(s);
}

// เปิดไพ่ทุกคน ครบจำนวนรอบจบเกม ไม่งั้นลงเงินรอบต่อไป
function endRound(s) {
  for (const x of s.order) pl(s, x).shown = true;
  const d = pl(s, s.dealer);
  if (d.won === null) d.won = 0;
  s.log.show = true;
  s.round++;
  if (s.round >= s.laps * s.order.length) finish(s);
  else startBet(s);
}

function finish(s) {
  const top = Math.max(...s.players.map((p) => p.score));
  s.phase = "over";
  s.winners = s.players.filter((p) => p.score === top).map((p) => p.name);
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { cards: [], bet: null, won: null, shown: false, done: false, score: 0 });
  s.order = [];
  s.phase = "lobby";
}

export default {
  max: 10,
  init: () => ({ laps: 2, phase: "lobby" }),
  player: () => ({ cards: [], bet: null, won: null, shown: false, done: false, score: 0 }),

  handle(s, id, msg) {
    const p = pl(s, id);
    const inRound = s.order && s.order.includes(id);
    if (s.phase === "bet" && msg.t === "bet" && inRound && id !== s.dealer && p.bet === null && BETS.includes(msg.n)) {
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
      if (msg.t === "laps" && s.phase === "lobby") s.laps = Math.min(5, Math.max(1, Math.round(Number(msg.value)) || 2));
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        toLobby(s);
        s.order = s.players.map((x) => x.id);
        s.dealer = null;
        s.round = 0;
        s.log = null;
        s.winners = null;
        startBet(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
  },

  // คนออก: เจ้ามือออกกลางรอบ ยกเลิกรอบนั้นแล้วเริ่มรอบใหม่ให้คนถัดไปเป็นเจ้ามือ
  // ผู้เล่นออก: ไม่ต้องรอเขาลงเงินหรือเลือกแล้ว
  leave(s, id) {
    if (!s.order || !s.order.includes(id)) return;
    if (s.players.length < 2) return toLobby(s);
    const i = s.order.indexOf(id);
    s.order.splice(i, 1);
    if (s.phase === "lobby" || s.phase === "over") return;
    if (s.dealer === id) {
      s.dealer = s.order[(i - 1 + s.order.length) % s.order.length];
      for (const x of s.order) Object.assign(pl(s, x), { cards: [], won: null, shown: false, done: false });
      s.log = null;
      return startBet(s);
    }
    if (s.phase === "bet" && players(s).every((x) => x.bet !== null)) deal(s);
    else if (s.phase === "draw") afterPlayers(s);
  },

  view(s, id) {
    const v = {
      screen: s.phase, laps: s.laps,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    };
    if (s.phase === "lobby") return v;
    Object.assign(v, {
      dealer: s.dealer, dealt: s.dealt, round: s.round, rounds: s.laps * s.order.length,
      // ไพ่คนอื่นเห็นแค่ด้านหลังจนกว่าจะเปิด
      seats: s.order.map((x) => {
        const p = pl(s, x);
        const see = p.shown || x === id;
        return { id: x, name: p.name, bet: p.bet, n: p.cards.length, cards: see ? p.cards : null, rate: see && p.cards.length ? rate(p.cards) : null, done: p.done, won: p.won };
      }),
      log: s.log, winners: s.winners,
    });
    return v;
  },
};
