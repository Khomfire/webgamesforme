// UNO: ลงไพ่สีเดียวกันหรือเลข/สัญลักษณ์เดียวกัน หมดมือก่อนได้แต้มจากไพ่ในมือคนอื่น ถึงเป้าหมายก่อนชนะ
// ไพ่ 108 ใบ: 4 สี (r y g b) มี 0 หนึ่งใบ 1-9 skip rev d2 อย่างละสองใบ, wild กับ w4 อย่างละสี่ใบ
const pl = (s, id) => s.players.find((p) => p.id === id);
const COLORS = ["r", "y", "g", "b"];

function newDeck() {
  const deck = [];
  for (const c of COLORS) {
    deck.push({ c, v: "0" });
    for (const v of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "rev", "d2"]) deck.push({ c, v }, { c, v });
  }
  for (let i = 0; i < 4; i++) deck.push({ c: "w", v: "wild" }, { c: "w", v: "w4" });
  return shuffle(deck.map((card, id) => ({ ...card, id })));
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const points = (card) => (card.c === "w" ? 50 : /^\d$/.test(card.v) ? Number(card.v) : 20);
const top = (s) => s.pile[s.pile.length - 1];
// ลงได้เมื่อสีตรงกับสีที่ใช้อยู่ หรือเลข/สัญลักษณ์ตรงกับใบบนสุด หรือเป็น wild
// w4 ลงได้เมื่อไม่มีไพ่สีที่ใช้อยู่ในมือ
// มี +2/+4 ค้างอยู่ (pending): ลงทับได้แค่ใบชนิดเดียวกัน (หน้าเกมมีสำเนาไว้เปิดปิดไพ่ ต้องแก้ให้ตรงกัน)
export function playable(card, hand, color, topCard, pending) {
  if (pending) return card.v === pending.v;
  if (card.v === "wild") return true;
  if (card.v === "w4") return !color || !hand.some((x) => x.c === color);
  return !color || card.c === color || card.v === topCard.v;
}

function draw(s, p, n) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) {
      if (s.pile.length < 2) return; // ไพ่อยู่ในมือหมดแล้ว
      const t = s.pile.pop();
      s.deck = shuffle(s.pile.map((x) => (x.c === "w" ? { ...x, pick: undefined } : x)));
      s.pile = [t];
    }
    p.hand.push(s.deck.pop());
  }
  p.uno = false;
}

const step = (s, from, k = 1) => s.order[(((s.order.indexOf(from) + s.dir * k) % s.order.length) + s.order.length) % s.order.length];

// คนก่อนหน้าหมดสิทธิ์โดนจับ UNO เมื่อคนถัดไปเริ่มเล่น
function endUnoWindow(s) {
  s.unoOpen = null;
}

function startRound(s) {
  s.dealer = s.dealer ? step(s, s.dealer) : s.order[s.order.length - 1];
  s.deck = newDeck();
  for (const id of s.order) {
    const p = pl(s, id);
    p.hand = [];
    draw(s, p, 7);
  }
  // ใบแรก: w4 ใส่กลับแล้วสับใหม่
  while (s.deck[s.deck.length - 1].v === "w4") shuffle(s.deck);
  s.pile = [s.deck.pop()];
  Object.assign(s, { phase: "play", dir: 1, drawn: null, pending: null, unoOpen: null, result: null, ready: [], color: top(s).c === "w" ? null : top(s).c });
  s.turn = step(s, s.dealer);
  s.log = { t: "deal", n: s.round++ };
  // ใบแรกเป็นการ์ดพิเศษ ใช้ผลกับคนแรก (wild: คนแรกลงสีไหนก็ได้)
  const v = top(s).v;
  if (v === "skip") s.turn = step(s, s.turn);
  if (v === "rev") {
    s.dir = -1;
    s.turn = s.order.length === 2 ? step(s, s.dealer, 2) : step(s, s.dealer);
  }
  if (v === "d2") {
    draw(s, pl(s, s.turn), 2);
    s.turn = step(s, s.turn);
  }
}

// ลงไพ่: ใช้ผลการ์ด ถ้าหมดมือจบรอบ ได้แต้มจากไพ่ในมือทุกคน
// +2/+4 ยังไม่จั่วทันที สะสมไว้ให้คนถัดไปลงทับหรือจั่วทั้งหมด
function play(s, id, card, pick) {
  const p = pl(s, id);
  p.hand = p.hand.filter((x) => x.id !== card.id);
  s.pile.push(card.c === "w" ? { ...card, pick } : card);
  s.color = card.c === "w" ? pick : card.c;
  s.drawn = null;
  s.log = { t: "play", by: id, card: top(s) };
  let next = step(s, id);
  if (card.v === "skip") next = step(s, id, 2);
  if (card.v === "rev") {
    s.dir *= -1;
    next = s.order.length === 2 ? id : step(s, id);
  }
  if (card.v === "d2" || card.v === "w4") s.pending = { v: card.v, n: ((s.pending && s.pending.n) || 0) + (card.v === "d2" ? 2 : 4) };
  if (!p.hand.length) {
    // ใบสุดท้ายเป็น +2/+4: คนถัดไปยังต้องจั่ว แล้วนับแต้มรวมด้วย
    if (s.pending) takePending(s, next);
    return endRound(s, id);
  }
  s.unoOpen = p.hand.length === 1 && !p.uno ? id : null;
  s.turn = next;
}

// จั่วไพ่ที่สะสมไว้ทั้งหมด แล้วเสียตา
function takePending(s, id) {
  draw(s, pl(s, id), s.pending.n);
  s.log.hit = { id, n: s.pending.n };
  s.pending = null;
}

function endRound(s, id) {
  const p = pl(s, id);
  const gained = s.players.reduce((n, x) => n + x.hand.reduce((m, c) => m + points(c), 0), 0);
  p.score += gained;
  s.result = { name: p.name, gained, hands: s.players.filter((x) => x.id !== id).map((x) => ({ name: x.name, cards: x.hand })) };
  s.unoOpen = null;
  s.phase = p.score >= s.target ? "over" : "end";
  if (s.phase === "over") s.winner = p.name;
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { hand: [], score: 0, uno: false });
  s.phase = "lobby";
}

export default {
  max: 10,
  init: () => ({ target: 500, phase: "lobby" }),
  player: () => ({ hand: [], score: 0, uno: false }),

  handle(s, id, msg) {
    const p = pl(s, id);
    if (s.phase === "play") {
      // กด UNO: ตัวเองเหลือ 1-2 ใบ = ประกาศ, คนอื่นยังไม่ประกาศ = จับได้ จั่ว 2
      if (msg.t === "uno") {
        if (s.unoOpen && s.unoOpen !== id) {
          const caught = pl(s, s.unoOpen);
          draw(s, caught, 2);
          s.log = { t: "caught", by: id, id: caught.id };
          s.unoOpen = null;
        } else if (p.hand.length <= 2 && !p.uno) {
          p.uno = true;
          if (s.unoOpen === id) s.unoOpen = null;
          s.log = { t: "uno", by: id };
        }
      }
      if (s.turn === id) {
        if (msg.t === "play") {
          const card = p.hand.find((x) => x.id === msg.id);
          const pick = COLORS.includes(msg.color) ? msg.color : null;
          // หลังจั่ว ลงได้แค่ใบที่เพิ่งจั่ว
          if (card && (s.drawn === null || s.drawn === card.id) && (card.c !== "w" || pick) && playable(card, p.hand, s.color, top(s), s.pending)) {
            endUnoWindow(s);
            if (p.hand.length > 2) p.uno = false;
            play(s, id, card, pick);
          }
        }
        if (msg.t === "draw" && s.drawn === null && s.pending) {
          endUnoWindow(s);
          s.log = { t: "draw", by: id };
          takePending(s, id);
          s.turn = step(s, id);
        } else if (msg.t === "draw" && s.drawn === null) {
          endUnoWindow(s);
          draw(s, p, 1);
          const card = p.hand[p.hand.length - 1];
          s.log = { t: "draw", by: id };
          if (card && playable(card, p.hand, s.color, top(s))) s.drawn = card.id;
          else s.turn = step(s, id);
        }
        if (msg.t === "pass" && s.drawn !== null) {
          s.drawn = null;
          s.turn = step(s, id);
        }
      }
    }
    if (msg.t === "ready" && s.phase === "end") {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length >= s.players.length) startRound(s);
    }
    if (id === s.owner) {
      if (msg.t === "target") s.target = Math.min(1000, Math.max(50, Math.round(Number(msg.value)) || 500));
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        s.order = s.players.map((p) => p.id);
        s.dealer = null;
        s.round = 0;
        startRound(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
  },

  // คนออก: ไพ่ในมือกลับเข้ากองจั่ว ถ้าเป็นตาเขา ไปคนถัดไป
  leave(s, id, gone) {
    if (!s.order || !s.order.includes(id)) return;
    if (s.players.length < 2) {
      s.order = [];
      return toLobby(s);
    }
    const next = step(s, id);
    const dealerNext = step(s, s.dealer);
    s.order.splice(s.order.indexOf(id), 1);
    if (s.dealer === id) s.dealer = s.order.includes(dealerNext) ? dealerNext : s.order[0];
    if (s.phase === "lobby") return;
    s.deck.unshift(...gone.hand);
    if (s.unoOpen === id) s.unoOpen = null;
    if (s.turn === id) {
      s.turn = next;
      s.drawn = null;
    }
    if (s.phase === "end") {
      s.ready = s.ready.filter((x) => x !== id);
      if (s.ready.length >= s.players.length) startRound(s);
    }
  },

  view(s, id) {
    const v = {
      screen: s.phase, target: s.target,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    };
    if (s.phase === "lobby") return v;
    const me = pl(s, id);
    const seats = s.order.map((x) => pl(s, x));
    Object.assign(v, {
      seats: seats.map((p) => ({ id: p.id, name: p.name, count: p.hand.length, uno: p.uno, now: s.phase === "play" && s.turn === p.id })),
      hand: me.hand, top: top(s), color: s.color, pending: s.pending, dir: s.dir, deck: s.deck.length,
      myTurn: s.phase === "play" && s.turn === id, drawn: s.turn === id ? s.drawn : null,
      turnName: pl(s, s.turn).name,
      // ปุ่ม UNO: มีคนลืมประกาศให้จับ หรือเราเหลือ 1-2 ใบยังไม่ประกาศ
      canUno: s.phase === "play" && ((!!s.unoOpen && s.unoOpen !== id) || (me.hand.length <= 2 && !me.uno && (s.turn === id || s.unoOpen === id))),
      log: s.log, result: s.result, winner: s.winner,
      ready: s.ready.includes(id), readyCount: s.ready.length,
    });
    return v;
  },
};
