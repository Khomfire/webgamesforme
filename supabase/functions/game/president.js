// PRESIDENT (ไพ่สลาฟ): แจกไพ่จนหมดสำรับ ลงไพ่ทับกองกลางให้ใหญ่กว่า หมดมือก่อนได้ตำแหน่งสูงกว่า
// ลงทีละ 1-4 ใบเลขเดียวกัน จำนวนใบเท่ากองกลาง (ตองทับเดี่ยวได้ โฟร์ทับคู่ได้) ผ่านแล้วลงกองนั้นไม่ได้อีก
// ทุกคนผ่าน คนลงล่าสุดเริ่มกองใหม่ (เขาหมดมือไปแล้ว คนถัดไปเริ่ม)
// จบรอบ: คนแรกที่หมดมือเป็นคิง คนที่ 2 ควีน คนรองสุดท้ายรองสลาฟ คนสุดท้ายสลาฟ ที่เหลือไพร่
// แต้มตามลำดับ สลาฟได้ 0 สูงขึ้นทีละ 1 จบรอบที่มีคนถึงแต้มเป้าหมาย แต้มมากสุดชนะ
// รอบต่อไป: สลาฟให้ไพ่ใหญ่สุด 2 ใบกับคิง รองสลาฟให้ 1 ใบกับควีน แล้วคิงกับควีนเลือกไพ่คืนเท่ากัน สลาฟเริ่มก่อน
// (รอบก่อนไม่มีควีน คิงกับสลาฟแลกกันใบเดียว) รอบแรกคนที่มี 3 ดอกจิกเริ่ม
// ไพ่ 52 ใบ: r = 1-13 (A-K), s = ดอก 0 โพดำ 1 โพแดง 2 ข้าวหลามตัด 3 ดอกจิก
const pl = (s, id) => s.players.find((p) => p.id === id);
const has = (s, id) => !!pl(s, id) && pl(s, id).hand.length > 0;
const TURN = 20000; // เวลาต่อตา และเวลาเลือกไพ่คืนตอนแลกไพ่ (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 5-60 วิ)

// ความใหญ่ของไพ่: 3 เล็กสุด ... K A 2 ใหญ่สุด เลขเท่ากันดูดอก โพดำ > โพแดง > ข้าวหลามตัด > ดอกจิก
// (หน้าเกมมีสำเนา power กับ beats ไว้เปิดปิดปุ่มลง ต้องแก้ให้ตรงกัน)
export const power = (c) => ((c.r + 10) % 13) * 4 + 3 - c.s;
const high = (cards) => Math.max(...cards.map(power));

// ลงไพ่ชุดนี้ทับกองได้ไหม กองว่างลงชุดไหนก็ได้ คู่หรือตองเลขเท่ากันเทียบใบที่ดอกใหญ่สุด
export function beats(cards, pile) {
  if (!cards.length || cards.length > 4 || cards.some((c) => c.r !== cards[0].r)) return false;
  if (!pile) return true;
  if ((cards.length === 3 && pile.length === 1) || (cards.length === 4 && pile.length === 2)) return true;
  return cards.length === pile.length && high(cards) > high(pile);
}

const sortHand = (p) => p.hand.sort((a, b) => power(a) - power(b));

function newDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ r, s, id: deck.length });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ตำแหน่งของคนที่หมดมือเป็นลำดับที่ i จาก n คน
function title(i, n) {
  if (i === 0) return "king";
  if (i === n - 1) return "slave";
  if (i === 1 && n >= 4) return "queen";
  if (i === n - 2 && n >= 4) return "vice";
  return "people";
}

// แจกไพ่ แล้วแลกไพ่ตามตำแหน่งรอบก่อน (คนที่ต้องให้ไพ่ใหญ่สุดให้ทันที คนรับเลือกไพ่คืนเอง)
function startRound(s) {
  const ps = s.order.map((x) => pl(s, x));
  for (const p of ps) p.hand = [];
  newDeck().forEach((c, i) => ps[i % ps.length].hand.push(c));
  Object.assign(s, { done: [], passed: [], pile: null, stack: [], lastBy: null, turn: null, ready: [], result: null });
  s.log = { t: "deal", n: s.round };
  const who = (t) => ps.find((p) => p.title === t);
  s.trades = [[who("king"), who("slave"), s.swap], [who("queen"), who("vice"), 1]].filter(([hi, lo]) => hi && lo).map(([hi, lo, k]) => {
    sortHand(lo);
    const got = lo.hand.splice(-k);
    hi.hand.push(...got);
    return { hi: hi.id, lo: lo.id, k, got, back: null };
  });
  for (const p of ps) sortHand(p);
  if (s.trades.length) s.phase = "trade";
  else startPlay(s);
}

// คนรับไพ่เลือกไพ่ k ใบคืนให้
function give(s, t, ids) {
  const hi = pl(s, t.hi), lo = pl(s, t.lo);
  const cards = [...new Set(ids)].map((x) => hi.hand.find((c) => c.id === x));
  if (cards.length !== t.k || !cards.every(Boolean)) return;
  hi.hand = hi.hand.filter((c) => !cards.includes(c));
  lo.hand.push(...cards);
  sortHand(lo);
  t.back = cards;
  if (s.trades.every((x) => x.back)) startPlay(s);
}

// สลาฟเริ่มก่อน ไม่มีสลาฟ (รอบแรกหรือสลาฟออกไปแล้ว) คนที่มี 3 ดอกจิกเริ่ม
function startPlay(s) {
  s.phase = "play";
  s.moves = 0;
  const slave = s.order.find((x) => pl(s, x).title === "slave");
  newTrick(s, slave || s.order.find((x) => pl(s, x).hand.some((c) => c.r === 3 && c.s === 3)));
}

// กองใหม่: ไพ่ที่ลงทับกันในกองก่อน (stack) เก็บทิ้ง
function newTrick(s, id) {
  Object.assign(s, { pile: null, stack: [], lastBy: null, passed: [], turn: id });
}

// คนถัดไปที่ยังมีไพ่ (from ไม่อยู่ในวงแล้วก็เริ่มนับจากคนแรก)
function nextActive(s, from) {
  const n = s.order.length, i = s.order.indexOf(from);
  for (let k = 1; k <= n; k++) if (has(s, s.order[(i + k) % n])) return s.order[(i + k) % n];
}

// ส่งตาต่อให้คนถัดไปที่ยังมีไพ่และยังไม่ผ่าน วนกลับมาถึงคนลงล่าสุดแปลว่าทุกคนผ่าน เขาเริ่มกองใหม่
// คนลงล่าสุดหมดมือหรือออกไปแล้วและทุกคนผ่าน คนถัดจากเขาเริ่มกองใหม่
function advance(s, from) {
  s.moves++;
  const n = s.order.length, i = s.order.indexOf(from);
  for (let k = 1; k <= n; k++) {
    const id = s.order[(i + k) % n];
    if (id === s.lastBy && has(s, id)) return newTrick(s, id);
    if (has(s, id) && !s.passed.includes(id)) {
      s.turn = id;
      return;
    }
  }
  newTrick(s, nextActive(s, s.order.includes(s.lastBy) ? s.lastBy : from));
}

function play(s, p, cards) {
  p.hand = p.hand.filter((c) => !cards.includes(c));
  s.pile = cards;
  s.stack.push({ by: p.id, cards });
  s.lastBy = p.id;
  s.log = { t: "play", by: p.id, cards };
  if (!p.hand.length) s.done.push(p.id);
  if (s.order.filter((x) => has(s, x)).length < 2) return endRound(s);
  advance(s, p.id);
}

function pass(s, id) {
  s.passed.push(id);
  s.log = { t: "pass", by: id };
  advance(s, id);
}

// คนสุดท้ายที่ยังมีไพ่เป็นสลาฟ ให้ตำแหน่งและแต้ม มีคนถึงแต้มเป้าหมายจบเกม
function endRound(s) {
  const last = s.order.find((x) => has(s, x));
  if (last) s.done.push(last);
  const n = s.done.length;
  s.result = s.done.map((x, i) => {
    const p = pl(s, x);
    Object.assign(p, { title: title(i, n), score: p.score + n - 1 - i });
    return { name: p.name, title: p.title, pts: n - 1 - i };
  });
  s.swap = n >= 4 ? 2 : 1; // มีควีน คิงกับสลาฟแลก 2 ใบ ไม่มีแลกใบเดียว
  Object.assign(s, { pile: null, stack: [], lastBy: null, turn: null, ready: [] });
  s.round++;
  if (s.players.some((p) => p.score >= s.target) || s.order.length < 2) finish(s);
  else s.phase = "end";
}

function finish(s) {
  const top = Math.max(...s.players.map((p) => p.score));
  s.phase = "over";
  s.winners = s.players.filter((p) => p.score === top).map((p) => p.name);
}

// หมดเวลา: แลกไพ่คืนใบเล็กสุด ตาเล่นผ่าน (เริ่มกองใหม่ผ่านไม่ได้ ลงใบเล็กสุด)
function timeUp(s) {
  if (s.phase === "trade") {
    for (const t of s.trades) if (!t.back) give(s, t, pl(s, t.hi).hand.slice(0, t.k).map((c) => c.id));
    return;
  }
  const p = pl(s, s.turn);
  if (s.pile) pass(s, p.id);
  else play(s, p, [p.hand[0]]);
  s.log.late = true;
}

// ตาเปลี่ยน (หรือช่วงแลกไพ่เริ่ม) เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.round, s.phase === "play" ? s.moves : ""].join();
const timed = (s) => s.phase === "trade" || s.phase === "play";

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { hand: [], score: 0, title: null });
  s.phase = "lobby";
}

export default {
  max: 8,
  init: () => ({ target: 10, time: TURN, phase: "lobby" }),
  player: () => ({ hand: [], score: 0, title: null }),

  handle(s, id, msg, now) {
    const p = pl(s, id);
    const key = turnKey(s);
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && timed(s) && now >= s.turnEnds) timeUp(s);
    if (s.phase === "trade" && msg.t === "give" && Array.isArray(msg.ids)) {
      const t = s.trades.find((x) => x.hi === id && !x.back);
      if (t) give(s, t, msg.ids);
    }
    if (s.phase === "play" && s.turn === id) {
      if (msg.t === "play" && Array.isArray(msg.ids)) {
        const cards = [...new Set(msg.ids)].map((x) => p.hand.find((c) => c.id === x));
        if (cards.every(Boolean) && beats(cards, s.pile)) play(s, p, cards);
      }
      if (msg.t === "pass" && s.pile) pass(s, id);
    }
    // รอบต่อไปเริ่มเมื่อทุกคนกดพร้อม
    if (msg.t === "ready" && s.phase === "end" && s.order.includes(id)) {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length >= s.order.length) startRound(s);
    }
    if (id === s.owner) {
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 20)) * 1000;
      if (msg.t === "target" && s.phase === "lobby") s.target = Math.min(50, Math.max(1, Math.round(Number(msg.value)) || 10));
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 3) {
        toLobby(s);
        s.order = s.players.map((x) => x.id);
        Object.assign(s, { round: 0, swap: 1, winners: null });
        startRound(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
    if (turnKey(s) !== key) s.turnEnds = now + (s.time || TURN);
  },

  // คนออก: เล่นต่อกับคนที่เหลือ ไพ่ของเขาไม่ใช้แล้ว
  // ช่วงแลกไพ่ คนรับออกก่อนคืนไพ่ คนให้ได้ไพ่ของตัวเองคืน
  leave(s, id) {
    if (!s.order || !s.order.includes(id)) return;
    if (s.players.length < 2) {
      s.order = [];
      return toLobby(s);
    }
    const key = turnKey(s);
    if (s.phase === "trade") {
      for (const t of s.trades) if (t.hi === id && !t.back) {
        pl(s, t.lo).hand.push(...t.got);
        sortHand(pl(s, t.lo));
      }
      s.trades = s.trades.filter((t) => t.hi !== id && t.lo !== id);
    }
    if (s.phase === "play") {
      s.done = s.done.filter((x) => x !== id);
      s.passed = s.passed.filter((x) => x !== id);
      if (s.turn === id) advance(s, id);
    }
    s.order.splice(s.order.indexOf(id), 1);
    if (s.phase === "lobby" || s.phase === "over") return;
    if (s.order.length < 2) return finish(s);
    if (s.phase === "trade" && s.trades.every((t) => t.back)) startPlay(s);
    else if (s.phase === "play" && s.order.filter((x) => has(s, x)).length < 2) endRound(s);
    else if (s.phase === "end") {
      s.ready = s.ready.filter((x) => x !== id);
      if (s.ready.length >= s.order.length) startRound(s);
    }
    if (turnKey(s) !== key) s.turnEnds = Date.now() + (s.time || TURN);
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, target: s.target, time: s.time || TURN,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score, title: p.title })),
    };
    if (s.phase === "lobby") return v;
    const name = (x) => (pl(s, x) || {}).name;
    const t = s.trades.find((x) => x.hi === id || x.lo === id);
    Object.assign(v, {
      round: s.round, turn: s.turn,
      seats: s.order.map((x) => {
        const p = pl(s, x);
        return { id: x, name: p.name, title: p.title, count: p.hand.length, passed: s.passed.includes(x), place: s.done.indexOf(x) };
      }),
      hand: s.order.includes(id) ? pl(s, id).hand : [],
      pile: s.pile, stack: s.stack, lastBy: s.lastBy,
      // แลกไพ่ของเรา: ไพ่ที่คนให้ส่งมา (got) และไพ่ที่คืน (back) เห็นแค่สองคนนั้น
      trade: t && (s.phase === "trade" || (s.phase === "play" && s.moves === 0))
        ? { k: t.k, hi: name(t.hi), lo: name(t.lo), got: t.got, back: t.back, mine: t.hi === id && !t.back, give: t.hi === id }
        : null,
      waiting: s.phase === "trade" ? s.trades.filter((x) => !x.back).map((x) => name(x.hi)) : null,
      log: s.log, result: s.result, winners: s.winners,
      ready: s.ready.includes(id), readyCount: s.ready.length,
      // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
      turnLeft: timed(s) ? Math.max(0, s.turnEnds - now) : null,
    });
    return v;
  },
};
