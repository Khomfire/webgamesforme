// TEXAS HOLD'EM (No-Limit): คนละ 2 ใบ ไพ่กลาง 5 ใบใช้ร่วมกัน เดิมพัน 4 รอบ ใช้ 5 ใบที่ดีที่สุดจาก 7 ใบ
// ปุ่ม D เวียนทีละคน คนถัดไปลง blind เล็ก ถัดไปลง blind ใหญ่ (เหลือ 2 คน: D ลง blind เล็ก)
// เริ่มคนละ CHIPS ชิป blind ขึ้นเท่าตัวทุก LEVEL มือ ชิปหมดตกรอบ เหลือคนสุดท้ายชนะ
// ไพ่ 52 ใบ: r = 1-13 (A-K), s = ดอก 0 โพดำ 1 โพแดง 2 ข้าวหลามตัด 3 ดอกจิก
const pl = (s, id) => s.players.find((p) => p.id === id);
const CHIPS = 1000, BLIND = 10, LEVEL = 10;

function newDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ r, s, id: deck.length });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ค่าของไพ่ 5 ใบ: [ชนิด, ...แต้มไว้เทียบ] เทียบทีละตัวจากซ้าย A = 14 ดอกไม่มีผล
// ชนิด: 8 สเตรทฟลัช 7 โฟร์การ์ด 6 ฟูลเฮาส์ 5 ฟลัช 4 สเตรท 3 ตอง 2 สองคู่ 1 คู่ 0 ไพ่สูง
function score5(cards) {
  const r = cards.map((c) => (c.r === 1 ? 14 : c.r)).sort((a, b) => b - a);
  const flush = cards.every((c) => c.s === cards[0].s);
  // สเตรท: 5 ใบเรียงกัน A ต่อหัว (A 2 3 4 5 นับ 5 เป็นใบสูงสุด) หรือต่อท้าย (10 J Q K A)
  const high = new Set(r).size < 5 ? 0 : r[0] - r[4] === 4 ? r[0] : r.join() === "14,5,4,3,2" ? 5 : 0;
  if (high) return [flush ? 8 : 4, high];
  if (flush) return [5, ...r];
  // แต้มซ้ำ: เรียงกลุ่มตามจำนวนใบแล้วตามแต้ม เช่น ฟูลเฮาส์ 3 ใบ + 2 ใบ
  const n = {};
  for (const x of r) n[x] = (n[x] || 0) + 1;
  const g = Object.keys(n).map(Number).sort((a, b) => n[b] - n[a] || b - a);
  return [{ 41: 7, 32: 6, 311: 3, 221: 2, 2111: 1, 11111: 0 }[g.map((x) => n[x]).join("")], ...g];
}

export const cmp = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

// 5 ใบที่ดีที่สุดจากไพ่ทั้งหมด: { score, cards }
export function best(cards) {
  let top = null;
  const pick = (from, chosen) => {
    if (chosen.length === 5) {
      const score = score5(chosen);
      if (!top || cmp(score, top.score) > 0) top = { score, cards: chosen };
      return;
    }
    for (let i = from; i <= cards.length - 5 + chosen.length; i++) pick(i + 1, [...chosen, cards[i]]);
  };
  pick(0, []);
  return top;
}

const after = (s, id, k = 1) => s.order[(s.order.indexOf(id) + k) % s.order.length];
const before = (s, id) => after(s, id, s.order.length - 1);
const inHand = (s) => s.order.filter((x) => !pl(s, x).folded);
const actors = (s) => inHand(s).filter((x) => pl(s, x).chips > 0);
const potSize = (s) => s.order.reduce((n, x) => n + pl(s, x).total, 0) + s.left.reduce((n, x) => n + x, 0);
// ยังต้องเล่น: ยังลงไม่เท่าคนอื่น หรือยังไม่ได้เล่นตั้งแต่มีคนเพิ่มเต็มขั้นครั้งล่าสุด
// (คนอื่นออลอินหมดแล้วและลงเท่ากันแล้ว ไม่ต้องเล่น)
const needs = (s, p) => !p.folded && p.chips > 0 && (p.bet < s.bet || (!p.acted && actors(s).length > 1));
// เพิ่มได้เมื่อยังไม่ได้เล่นตั้งแต่มีคนเพิ่มเต็มขั้น (ออลอินที่เพิ่มไม่ถึงขั้นต่ำ คนที่เล่นไปแล้วได้แค่ตามหรือหมอบ)
// และยังมีคนอื่นที่มีชิปพอจะตาม
const canRaise = (s, p) => !p.acted && p.bet + p.chips > s.bet && actors(s).length > 1;

function put(p, n) {
  p.chips -= n;
  p.bet += n;
  p.total += n;
}

// แจกคนละ 2 ใบ เริ่มจากคนถัดจาก D แล้วลง blind
function startHand(s) {
  s.order = s.order.filter((x) => pl(s, x).chips > 0);
  s.sb = BLIND * 2 ** Math.floor(s.hands / LEVEL);
  s.bb = s.sb * 2;
  for (const x of s.order) Object.assign(pl(s, x), { cards: [], bet: 0, total: 0, folded: false, acted: false, last: null });
  s.deck = newDeck();
  s.board = [];
  s.street = 0;
  s.left = []; // ชิปที่คนออกจากห้องกลางมือลงไว้ อยู่ในกองกลางแต่ไม่มีใครมีสิทธิ์
  s.result = null;
  for (let i = 0; i < 2; i++) for (let k = 1; k <= s.order.length; k++) pl(s, after(s, s.button, k)).cards.push(s.deck.pop());
  const two = s.order.length === 2;
  const sb = two ? s.button : after(s, s.button), bb = after(s, sb);
  put(pl(s, sb), Math.min(s.sb, pl(s, sb).chips));
  put(pl(s, bb), Math.min(s.bb, pl(s, bb).chips));
  // blind ใหญ่ลงไม่ครบ (ชิปไม่พอ) คนอื่นก็ยังต้องตามเต็ม blind ใหญ่
  s.bet = s.bb;
  s.minRaise = s.bb;
  s.phase = "play";
  s.log = { t: "deal", n: s.hands };
  proceed(s, bb);
}

// ตาต่อไป: คนถัดจาก from ที่ยังต้องเล่น ไม่มีแล้วเปิดไพ่กลางรอบต่อไป เหลือคนเดียวที่ไม่หมอบได้กองกลาง
function proceed(s, from) {
  if (inHand(s).length === 1) return win(s);
  for (let k = 1; k <= s.order.length; k++) {
    const x = after(s, from, k);
    if (needs(s, pl(s, x))) {
      s.turn = x;
      return;
    }
  }
  nextStreet(s);
}

// เก็บเงินที่ลงเข้ากองกลาง เปิดไพ่กลาง (flop 3 ใบ, turn 1, river 1 เผาทิ้ง 1 ใบก่อนเปิดทุกครั้ง) คนถัดจาก D เล่นก่อน
function nextStreet(s) {
  for (const x of s.order) Object.assign(pl(s, x), { bet: 0, acted: false, last: null });
  s.bet = 0;
  s.minRaise = s.bb;
  s.turn = null;
  if (s.street === 3) return showdown(s);
  s.street++;
  s.deck.pop();
  for (let i = s.street === 1 ? 3 : 1; i > 0; i--) s.board.push(s.deck.pop());
  proceed(s, s.button);
}

// ทุกคนหมอบ เหลือคนเดียว ได้กองกลางทั้งหมด ไม่ต้องเปิดไพ่
function win(s) {
  const [x] = inHand(s);
  const n = potSize(s);
  pl(s, x).chips += n;
  s.result = { pots: [{ n, ids: [x], names: [pl(s, x).name] }], won: { [x]: n }, hands: null };
  endHand(s);
}

// เปิดไพ่: กองกลางแยกตามระดับที่แต่ละคนลงถึง (side pot) แต่ละกองมือดีสุดในคนที่ลงถึงได้ไป
// คนหมอบหรือออกไปแล้วเสียชิปที่ลงแต่ไม่มีสิทธิ์ ส่วนที่ไม่มีใครตามก็กลับไปหาคนลง
// เท่ากันแบ่ง เศษชิปให้คนชนะที่นั่งถัดจาก D ก่อน
function showdown(s) {
  const live = inHand(s);
  const hands = Object.fromEntries(live.map((x) => [x, best([...pl(s, x).cards, ...s.board])]));
  const paid = s.order.map((x) => ({ x, n: pl(s, x).total, live: !pl(s, x).folded })).concat(s.left.map((n) => ({ n, live: false })));
  const pots = [];
  while (paid.some((c) => c.live && c.n > 0)) {
    const can = paid.filter((c) => c.live && c.n > 0).map((c) => c.x);
    const lvl = Math.min(...can.map((x) => paid.find((c) => c.x === x).n));
    let n = 0;
    for (const c of paid) {
      const a = Math.min(c.n, lvl);
      n += a;
      c.n -= a;
    }
    const top = can.reduce((a, x) => (cmp(hands[x].score, a) > 0 ? hands[x].score : a), hands[can[0]].score);
    const ids = can.filter((x) => cmp(hands[x].score, top) === 0);
    const last = pots[pots.length - 1];
    if (last && last.ids.join() === ids.join()) last.n += n; // กองติดกันที่คนได้ชุดเดียวกัน รวมเป็นกองเดียว
    else pots.push({ n, ids, names: ids.map((x) => pl(s, x).name) });
  }
  pots[pots.length - 1].n += paid.reduce((n, c) => n + c.n, 0);
  const won = {};
  const seat = (x) => (s.order.indexOf(x) - s.order.indexOf(s.button) + s.order.length - 1) % s.order.length;
  for (const pot of pots) {
    const ws = [...pot.ids].sort((a, b) => seat(a) - seat(b));
    const share = Math.floor(pot.n / ws.length);
    ws.forEach((x, i) => {
      const n = share + (i < pot.n - share * ws.length ? 1 : 0);
      pl(s, x).chips += n;
      won[x] = (won[x] || 0) + n;
    });
  }
  s.result = { pots, won, hands: Object.fromEntries(live.map((x) => [x, { kind: hands[x].score[0], best: hands[x].cards.map((c) => c.id) }])) };
  endHand(s);
}

// จบมือ: ชิปหมดตกรอบ เหลือคนเดียวจบเกม ไม่งั้นรอทุกคนกดมือต่อไป
function endHand(s) {
  for (const x of s.order) {
    const p = pl(s, x);
    p.bet = 0;
    if (!p.chips) p.out = true;
  }
  s.turn = null;
  s.phase = "end";
  s.ready = [];
  if (s.order.filter((x) => pl(s, x).chips > 0).length < 2) finish(s);
}

// มือต่อไป: D ย้ายไปคนถัดไปที่ยังมีชิป
function nextHand(s) {
  const i = s.order.indexOf(s.button);
  s.button = [...s.order.slice(i + 1), ...s.order.slice(0, i + 1)].find((x) => pl(s, x).chips > 0);
  s.hands++;
  startHand(s);
}

function finish(s) {
  const top = Math.max(...s.players.map((p) => p.chips));
  s.phase = "over";
  s.turn = null;
  s.winner = s.players.find((p) => p.chips === top).name;
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { chips: 0, cards: [], bet: 0, total: 0, folded: false, acted: false, last: null, out: false });
  s.order = [];
  s.phase = "lobby";
}

// หมอบ ผ่าน ตาม หรือเพิ่ม (to = ยอดที่ลงรวมในรอบนี้) ถ้าเป็นตาเรา
function act(s, p, msg) {
  const max = p.bet + p.chips;
  const opened = s.bet > 0;
  if (msg.t === "fold") p.folded = true;
  else if (msg.t === "check" && p.bet === s.bet);
  else if (msg.t === "call" && p.bet < s.bet) put(p, Math.min(s.bet, max) - p.bet);
  else if (msg.t === "raise" && canRaise(s, p) && Number.isInteger(msg.to) && msg.to > s.bet && msg.to <= max && (msg.to >= s.bet + s.minRaise || msg.to === max)) {
    // เพิ่มเต็มขั้น: ทุกคนต้องเล่นใหม่และเพิ่มต่อได้ ออลอินที่เพิ่มไม่ถึงขั้นไม่เปิดให้คนที่เล่นแล้วเพิ่มต่อ
    if (msg.to - s.bet >= s.minRaise) {
      s.minRaise = msg.to - s.bet;
      for (const x of s.order) pl(s, x).acted = false;
    }
    put(p, msg.to - p.bet);
    s.bet = msg.to;
  } else return;
  p.acted = true;
  const a = msg.t === "raise" && !opened ? "bet" : msg.t;
  p.last = { a, allin: !p.folded && !p.chips };
  s.log = { t: a, by: p.id, n: s.hands, st: s.street, to: p.bet, allin: p.last.allin };
  proceed(s, p.id);
}

export default {
  max: 10,
  init: () => ({ phase: "lobby" }),
  player: () => ({ chips: 0, cards: [], bet: 0, total: 0, folded: false, acted: false, last: null, out: false }),

  handle(s, id, msg) {
    const p = pl(s, id);
    if (s.phase === "play" && s.turn === id) act(s, p, msg);
    if (msg.t === "ready" && s.phase === "end" && s.order.includes(id) && p.chips > 0 && !s.ready.includes(id)) {
      s.ready.push(id);
      if (s.order.every((x) => !pl(s, x).chips || s.ready.includes(x))) nextHand(s);
    }
    if (id === s.owner) {
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        toLobby(s);
        for (const x of s.players) x.chips = CHIPS;
        s.order = s.players.map((x) => x.id);
        s.button = s.order[Math.floor(Math.random() * s.order.length)];
        s.hands = 0;
        s.winner = null;
        startHand(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
  },

  // คนออกกลางมือ: นับเป็นหมอบ ชิปที่ลงไว้อยู่ในกองกลาง ถ้าเป็นตาเขาก็ไปคนถัดไป
  leave(s, id, gone) {
    if (!s.order || !s.order.includes(id)) return;
    if (s.players.length < 2) return toLobby(s);
    const prev = before(s, id);
    s.order.splice(s.order.indexOf(id), 1);
    if (s.button === id) s.button = prev; // D มือต่อไปไปที่คนถัดจากคนที่ออก
    if (s.phase === "play") {
      if (gone.total) s.left.push(gone.total);
      proceed(s, s.turn === id ? prev : before(s, s.turn));
    } else if (s.phase === "end") {
      s.ready = s.ready.filter((x) => x !== id);
      if (s.order.filter((x) => pl(s, x).chips > 0).length < 2) finish(s);
      else if (s.order.every((x) => !pl(s, x).chips || s.ready.includes(x))) nextHand(s);
    }
  },

  view(s, id) {
    const v = { screen: s.phase, players: s.players.map((p) => ({ id: p.id, name: p.name, chips: p.chips, out: p.out })) };
    if (s.phase === "lobby") return v;
    const me = pl(s, id);
    const shown = s.phase !== "play" && s.result && s.result.hands;
    Object.assign(v, {
      handNo: s.hands + 1, sb: s.sb, bb: s.bb, button: s.button, turn: s.turn, board: s.board, pot: potSize(s),
      // ไพ่คนอื่นเห็นแค่ด้านหลัง จนเปิดไพ่ตอนจบ (คนหมอบไม่ต้องเปิด)
      seats: s.order.map((x) => {
        const p = pl(s, x);
        return { id: x, name: p.name, chips: p.chips, bet: p.bet, folded: p.folded, last: p.last, n: p.cards.length, cards: x === id || (shown && !p.folded) ? p.cards : null };
      }),
      result: s.phase === "play" ? null : s.result,
      ready: s.ready, winner: s.winner, log: s.log,
    });
    // ชนิดมือที่ดีที่สุดของเราตอนนี้
    if (s.order.includes(id) && me.cards.length && s.board.length) v.mine = best([...me.cards, ...s.board]).score[0];
    if (s.phase === "play" && s.turn === id) {
      const max = me.bet + me.chips;
      v.opts = { call: Math.min(s.bet, max) - me.bet, allin: s.bet >= max, opened: s.bet > 0, raise: canRaise(s, me) ? { min: Math.min(s.bet + s.minRaise, max), max } : null };
    }
    return v;
  },
};
