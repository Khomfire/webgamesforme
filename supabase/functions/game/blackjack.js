// BLACKJACK: ทุกคนเล่นกับเจ้ามือ (server เป็นเจ้ามือ) ใกล้ 21 ที่สุดโดยไม่เกินชนะ
// A = 1 หรือ 11, J Q K = 10 ไพ่ 6 สำรับ เหลือไม่ถึง 1/4 สับใหม่ก่อนแจกมือถัดไป
// ลงเงิน แจกคนละ 2 ใบ เจ้ามือหงาย 1 คว่ำ 1 เจ้ามือหงาย A ซื้อ insurance ได้ (ครึ่งหนึ่งของที่ลง จ่าย 2:1)
// เจ้ามือหงาย A หรือ 10 แอบดูใบคว่ำ ได้ blackjack เปิดทันที ไม่งั้นผลัดกันเล่นทีละมือ
// hit, stand, double (2 ใบแรก ลงเพิ่มเท่าตัวแล้วได้อีกใบเดียว), split (คู่เลขเดียวกัน ได้ถึง 4 มือ split A ได้มือละใบเดียว)
// จบแล้วเจ้ามือเปิดใบคว่ำ จั่วจนได้ 17 ขึ้นไป (soft 17 ก็หยุด) blackjack จ่าย 3:2 ชนะ 1:1 เท่ากันคืนเงิน
// ชิปไม่พอลงขั้นต่ำตกรอบ ครบจำนวนมือหรือทุกคนตกรอบ ชิปมากสุดชนะ
// ไพ่: r = 1-13 (A-K), s = ดอก 0 โพดำ 1 โพแดง 2 ข้าวหลามตัด 3 ดอกจิก
const pl = (s, id) => s.players.find((p) => p.id === id);
const TURN = 15000; // เวลาลงเงิน เวลาเลือก insurance และเวลาต่อมือ (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ)
const CHIPS = 1000; // ชิปเริ่มต้น
const MIN = 10; // ลงขั้นต่ำ และลงทีละเท่านี้
const DECKS = 6;
const MAX_HANDS = 4;

function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) shoe.push({ r, s, id: shoe.length });
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}
const take = (s) => (s.shoe.length ? s.shoe : (s.shoe = newShoe())).pop();

// แต้มของไพ่: A นับ 11 ได้ถ้าไม่เกิน 21 (soft)
export function total(cards) {
  let t = 0, ace = false;
  for (const c of cards) {
    t += Math.min(c.r, 10);
    if (c.r === 1) ace = true;
  }
  return ace && t + 10 <= 21 ? { t: t + 10, soft: true } : { t, soft: false };
}
// blackjack: 2 ใบแรกได้ 21 (มือที่ split มาไม่นับ)
const natural = (h) => h.cards.length === 2 && !h.split && total(h.cards).t === 21;
const hand = (cards, bet, split) => ({ cards, bet, split, aces: false, done: false, res: null, won: null });

// ลงเงิน: ไพ่มือก่อนยังเปิดโชว์อยู่จนกว่าจะแจกใหม่
function startBet(s) {
  s.phase = "bet";
  for (const x of s.order) pl(s, x).bet = null;
}

// แจกทีละใบ คนแรกถึงคนสุดท้ายแล้วเจ้ามือ สองรอบ ใบที่สองของเจ้ามือคว่ำไว้
function deal(s) {
  const shuffled = s.shoe.length < (DECKS * 52) / 4;
  if (shuffled) s.shoe = newShoe();
  s.round++;
  s.inHand = [...s.order]; // คนที่ได้ไพ่มือนี้ คนตกรอบยังโชว์ไพ่ไว้จนแจกมือใหม่
  const ps = s.order.map((x) => pl(s, x));
  for (const p of ps) {
    p.chips -= p.bet;
    Object.assign(p, { hands: [hand([], p.bet, false)], ins: null, won: null });
  }
  s.dealer = { cards: [], shown: false };
  for (let i = 0; i < 2; i++) {
    for (const p of ps) p.hands[0].cards.push(take(s));
    s.dealer.cards.push(take(s));
  }
  s.turn = null;
  s.log = { t: "deal", n: s.round, shuffled };
  // เจ้ามือหงาย A: ถามทุกคนที่มีชิปพอว่าจะซื้อ insurance ไหม
  if (s.dealer.cards[0].r === 1) {
    for (const p of ps) p.ins = p.chips >= p.bet / 2 ? null : 0;
    if (ps.some((p) => p.ins === null)) {
      s.phase = "insurance";
      return;
    }
  }
  peek(s);
}

// เจ้ามือหงาย A หรือ 10 แอบดูใบคว่ำ ได้ blackjack เปิดแล้วจบมือเลย
function peek(s) {
  const up = s.dealer.cards[0].r;
  if ((up === 1 || up >= 10) && total(s.dealer.cards).t === 21) {
    s.dealer.shown = true;
    return settle(s);
  }
  for (const x of s.order) for (const h of pl(s, x).hands) if (natural(h)) h.done = true;
  s.phase = "play";
  nextTurn(s);
}

// ถึงมือถัดไปที่ยังไม่จบ ตามลำดับที่นั่ง มือที่ split มาได้ใบที่สองตอนถึงตา
function nextTurn(s) {
  for (const x of s.order) {
    const p = pl(s, x);
    for (let i = 0; i < p.hands.length; i++) {
      const h = p.hands[i];
      if (h.done) continue;
      if (h.cards.length === 1) {
        h.cards.push(take(s));
        // split A ได้ใบเดียว ไม่งั้นได้ 21 ก็พอแล้ว
        if (h.aces || total(h.cards).t === 21) {
          h.done = true;
          continue;
        }
      }
      s.turn = { id: x, h: i };
      return;
    }
  }
  s.turn = null;
  dealerPlay(s);
}

// เจ้ามือเปิดใบคว่ำ ยังมีมือที่ต้องเทียบก็จั่วจนได้ 17 ขึ้นไป
function dealerPlay(s) {
  s.dealer.shown = true;
  const live = s.order.some((x) => pl(s, x).hands.some((h) => total(h.cards).t <= 21 && !natural(h)));
  if (live) while (total(s.dealer.cards).t < 17) s.dealer.cards.push(take(s));
  settle(s);
}

// จ่ายเงิน res: 1.5 blackjack, 1 ชนะ, 0 เสมอ, -1 แพ้ ได้คืนที่ลงไว้ + ที่ลง x res
function settle(s) {
  const d = total(s.dealer.cards).t;
  const dbj = s.dealer.cards.length === 2 && d === 21;
  for (const x of s.order) {
    const p = pl(s, x);
    let net = 0;
    if (p.ins) {
      if (dbj) p.chips += p.ins * 3;
      net += dbj ? p.ins * 2 : -p.ins;
    }
    for (const h of p.hands) {
      const t = total(h.cards).t;
      h.res = t > 21 ? -1 : natural(h) ? (dbj ? 0 : 1.5) : dbj ? -1 : d > 21 ? 1 : Math.sign(t - d);
      h.won = h.bet * h.res;
      h.done = true;
      p.chips += h.bet + h.won;
      net += h.won;
    }
    p.won = net;
  }
  s.log = { t: "settle", n: s.round };
  for (const x of s.order) if (pl(s, x).chips < MIN) pl(s, x).out = true;
  s.order = s.order.filter((x) => !pl(s, x).out);
  if (!s.order.length || s.round >= s.rounds) finish(s);
  else startBet(s);
}

function finish(s) {
  const top = Math.max(...s.players.map((p) => p.chips));
  s.phase = "over";
  s.turn = null;
  s.winners = s.players.filter((p) => p.chips === top).map((p) => p.name);
}

// หมดเวลา: ลงขั้นต่ำ, ไม่ซื้อ insurance, stand
function timeUp(s) {
  if (s.phase === "bet") {
    for (const x of s.order) if (pl(s, x).bet === null) pl(s, x).bet = MIN;
    deal(s);
  } else if (s.phase === "insurance") {
    for (const x of s.order) if (pl(s, x).ins === null) pl(s, x).ins = 0;
    peek(s);
  } else {
    pl(s, s.turn.id).hands[s.turn.h].done = true;
    nextTurn(s);
  }
}

// ทำอะไรกับมือที่ถึงตาได้บ้าง
function can(s, p, h) {
  const pair = h.cards.length === 2 && h.cards[0].r === h.cards[1].r;
  return {
    double: h.cards.length === 2 && p.chips >= h.bet,
    split: pair && !h.aces && p.hands.length < MAX_HANDS && p.chips >= h.bet,
  };
}

// ตาเปลี่ยน (ลงเงิน insurance มือที่ถึงตา) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.round, s.turn && s.turn.id, s.turn && s.turn.h].join();
const timed = (s) => s.phase === "bet" || s.phase === "insurance" || s.phase === "play";

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { chips: 0, bet: null, ins: null, hands: [], won: null, out: false });
  s.order = [];
  s.phase = "lobby";
}

export default {
  max: 7,
  init: () => ({ rounds: 20, time: TURN, phase: "lobby" }),
  player: () => ({ chips: 0, bet: null, ins: null, hands: [], won: null, out: false }),

  handle(s, id, msg, now) {
    const p = pl(s, id);
    const inRound = s.order && s.order.includes(id);
    const key = turnKey(s);
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && timed(s) && now >= s.turnEnds) timeUp(s);
    const n = msg.n;
    if (s.phase === "bet" && msg.t === "bet" && inRound && p.bet === null && Number.isInteger(n) && n >= MIN && n <= p.chips && n % MIN === 0) {
      p.bet = n;
      if (s.order.every((x) => pl(s, x).bet !== null)) deal(s);
    } else if (s.phase === "insurance" && msg.t === "insure" && inRound && p.ins === null) {
      p.ins = msg.on ? p.bet / 2 : 0;
      p.chips -= p.ins;
      if (s.order.every((x) => pl(s, x).ins !== null)) peek(s);
    } else if (s.phase === "play" && s.turn.id === id) {
      const h = p.hands[s.turn.h];
      const ok = can(s, p, h);
      if (msg.t === "hit") {
        h.cards.push(take(s));
        if (total(h.cards).t >= 21) h.done = true;
      } else if (msg.t === "stand") h.done = true;
      else if (msg.t === "double" && ok.double) {
        p.chips -= h.bet;
        h.bet *= 2;
        h.cards.push(take(s));
        h.done = true;
      } else if (msg.t === "split" && ok.split) {
        p.chips -= h.bet;
        const other = hand([h.cards.pop()], h.bet, true);
        h.split = true;
        h.aces = other.aces = h.cards[0].r === 1;
        p.hands.splice(s.turn.h + 1, 0, other);
        h.cards.push(take(s));
        if (h.aces || total(h.cards).t === 21) h.done = true;
      }
      if (h.done) nextTurn(s);
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "rounds" && s.phase === "lobby") s.rounds = Math.min(50, Math.max(5, Math.round(Number(msg.value) / 5) * 5 || 20));
      if (msg.t === "start" && s.phase === "lobby") {
        toLobby(s);
        for (const x of s.players) x.chips = CHIPS;
        s.order = s.players.map((x) => x.id);
        s.shoe = newShoe();
        s.round = 0;
        s.dealer = null;
        s.turn = null;
        s.log = null;
        s.winners = null;
        s.inHand = null;
        startBet(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
    if (turnKey(s) !== key) s.turnEnds = now + (s.time || TURN);
  },

  // คนออก: เล่นต่อกับคนที่เหลือ ไม่ต้องรอเขาลงเงิน เลือก insurance หรือเล่นมือของเขาแล้ว
  leave(s, id) {
    if (!s.order || !s.order.includes(id)) return;
    const key = turnKey(s);
    s.order = s.order.filter((x) => x !== id);
    if (s.inHand) s.inHand = s.inHand.filter((x) => x !== id);
    if (s.phase === "lobby" || s.phase === "over") return;
    if (!s.order.length) return finish(s);
    if (s.phase === "bet" && s.order.every((x) => pl(s, x).bet !== null)) deal(s);
    else if (s.phase === "insurance" && s.order.every((x) => pl(s, x).ins !== null)) peek(s);
    else if (s.phase === "play" && s.turn.id === id) nextTurn(s);
    if (turnKey(s) !== key) s.turnEnds = Date.now() + (s.time || TURN);
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, rounds: s.rounds, time: s.time || TURN, min: MIN, chips: CHIPS,
      players: s.players.map((p) => ({ id: p.id, name: p.name, chips: p.chips, out: p.out })),
    };
    if (s.phase === "lobby") return v;
    const d = s.dealer;
    Object.assign(v, {
      round: s.round, turn: s.turn, log: s.log, winners: s.winners,
      // ใบคว่ำของเจ้ามือส่งเป็น null จนกว่าจะเปิด
      dealer: d && { cards: d.shown ? d.cards : [d.cards[0], null], total: total(d.shown ? d.cards : [d.cards[0]]), shown: d.shown },
      seats: (s.inHand || s.order).filter((x) => pl(s, x)).map((x) => {
        const p = pl(s, x);
        return {
          id: x, name: p.name, chips: p.chips, bet: p.bet, ins: p.ins, won: p.won, out: p.out,
          hands: p.hands.map((h) => ({ cards: h.cards, bet: h.bet, total: total(h.cards), bj: natural(h), done: h.done, res: h.res, won: h.won })),
        };
      }),
      can: s.phase === "play" && s.turn.id === id ? can(s, pl(s, id), pl(s, id).hands[s.turn.h]) : null,
      // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
      turnLeft: timed(s) ? Math.max(0, s.turnEnds - now) : null,
    });
    return v;
  },
};
