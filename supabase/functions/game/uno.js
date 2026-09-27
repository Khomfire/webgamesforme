// UNO: ลงไพ่สีเดียวกันหรือเลข/สัญลักษณ์เดียวกัน คนหมดมือชนะรอบ คนอื่นบวกแต้มไพ่ในมือตัวเองเป็นแต้มเสีย
// แต้มเสียถึงที่กำหนดตกรอบ เหลือคนสุดท้ายชนะ
// ไพ่ 108 ใบ: 4 สี (r y g b) มี 0 หนึ่งใบ 1-9 skip rev d2 อย่างละสองใบ, wild กับ w4 อย่างละสี่ใบ
const pl = (s, id) => s.players.find((p) => p.id === id);
const COLORS = ["r", "y", "g", "b"];
const TURN = 15000; // เวลาต่อตา

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
// มี +2/+4 ค้างอยู่ (pending): ลงทับด้วยใบชนิดเดียวกัน หรือ +4 ทับ +2 ได้ (+2 ทับ +4 ไม่ได้)
// (หน้าเกมมีสำเนาไว้เปิดปิดไพ่ ต้องแก้ให้ตรงกัน)
export function playable(card, hand, color, topCard, pending) {
  if (pending) return card.v === pending.v || card.v === "w4";
  if (card.v === "wild") return true;
  if (card.v === "w4") return !color || !hand.some((x) => x.c === color);
  return !color || card.c === color || card.v === topCard.v;
}

function draw(s, p, n) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) {
      if (s.pile.length < 2) return; // ไพ่อยู่ในมือหมดแล้ว
      // กองจั่วหมด: สับกองทิ้ง (ยกเว้นใบบนสุด) มาเป็นกองจั่วใหม่
      const t = s.pile.pop();
      s.deck = shuffle(s.pile.map((x) => (x.c === "w" ? { ...x, pick: undefined } : x)));
      s.pile = [t];
      s.shuffles = (s.shuffles || 0) + 1;
    }
    p.hand.push(s.deck.pop());
  }
  p.uno = false;
}

const step = (s, from, k = 1) => s.order[(((s.order.indexOf(from) + s.dir * k) % s.order.length) + s.order.length) % s.order.length];

// เหลือ 1 ใบแล้วไม่กด UNO ก่อนคนอื่นเล่น (ลงหรือจั่ว) จั่ว 2
// คืน id ของคนที่โดนไว้ใส่ใน log
function endUnoWindow(s, actor) {
  const missed = s.unoOpen;
  s.unoOpen = null;
  if (!missed || missed === actor) return null;
  draw(s, pl(s, missed), 2);
  return missed;
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
  Object.assign(s, { phase: "play", dir: 1, drawn: null, pending: null, unoOpen: null, result: null, ready: [], color: top(s).c === "w" ? null : top(s).c, turnEnds: Date.now() + TURN });
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

// ลงไพ่: ใช้ผลการ์ด ถ้าหมดมือจบรอบ
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

// จั่ว: มียอด +2/+4 จั่วตามยอดแล้วเสียตา ไม่มีก็จั่ว 1 ใบ ใบนั้นลงได้จะลงหรือผ่านก็ได้
function drawTurn(s, id) {
  const p = pl(s, id);
  s.log = { t: "draw", by: id, missed: endUnoWindow(s, id) };
  if (s.pending) {
    takePending(s, id);
    s.turn = step(s, id);
    return;
  }
  draw(s, p, 1);
  const card = p.hand[p.hand.length - 1];
  if (card && playable(card, p.hand, s.color, top(s))) s.drawn = card.id;
  else s.turn = step(s, id);
}

// หมดเวลา: จั่วเหมือนกดจั่ว (ถ้ายังไม่ได้จั่ว) แล้วเสียตา
function timeUp(s, id) {
  if (s.drawn === null) drawTurn(s, id);
  else s.log = { t: "pass", by: id };
  if (s.turn === id) {
    s.drawn = null;
    s.turn = step(s, id);
  }
  s.log.late = id;
}

// จบรอบ: คนที่ยังมีไพ่บวกแต้มไพ่ในมือตัวเองเป็นแต้มเสีย ถึงที่กำหนดตกรอบ
// คนหมดมือได้ 0 แต้มจึงไม่ตกรอบ เหลืออย่างน้อยหนึ่งคนเสมอ
function endRound(s, id) {
  const hands = [];
  for (const x of s.order.map((o) => pl(s, o)).filter((x) => x.id !== id)) {
    const pts = x.hand.reduce((m, c) => m + points(c), 0);
    x.score += pts;
    hands.push({ name: x.name, cards: x.hand, pts });
  }
  const out = s.order.map((o) => pl(s, o)).filter((x) => x.score >= s.target);
  for (const x of out) Object.assign(x, { out: true, hand: [] });
  s.result = { name: pl(s, id).name, hands, out: out.map((x) => x.name) };
  s.unoOpen = null;
  s.pending = null;
  s.order = s.order.filter((o) => !pl(s, o).out);
  if (s.order.length > 1) s.phase = "end";
  else finish(s, pl(s, s.order[0]));
}

function finish(s, p) {
  s.phase = "over";
  s.winner = p.name;
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { hand: [], score: 0, uno: false, out: false });
  s.phase = "lobby";
}

export default {
  max: 10,
  init: () => ({ target: 500, phase: "lobby" }),
  player: () => ({ hand: [], score: 0, uno: false, out: false }),

  handle(s, id, msg, now) {
    const p = pl(s, id);
    // ตาเปลี่ยนหรือคนเดิมเล่นต่อ เริ่มนับเวลาใหม่
    const turnKey = () => [s.phase, s.turn, s.drawn, s.pile && s.pile.length].join();
    const before = turnKey();
    if (s.phase === "play") {
      // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
      if (msg.t === "timeout" && now >= s.turnEnds) timeUp(s, s.turn);
      // กด UNO: ได้เฉพาะตอนเหลือ 1 ใบและยังไม่มีใครเล่นต่อ
      if (msg.t === "uno" && s.unoOpen === id) {
        p.uno = true;
        s.unoOpen = null;
        s.log = { t: "uno", by: id };
      }
      if (s.turn === id) {
        if (msg.t === "play") {
          const card = p.hand.find((x) => x.id === msg.id);
          const pick = COLORS.includes(msg.color) ? msg.color : null;
          // หลังจั่ว ลงได้แค่ใบที่เพิ่งจั่ว
          if (card && (s.drawn === null || s.drawn === card.id) && (card.c !== "w" || pick) && playable(card, p.hand, s.color, top(s), s.pending)) {
            const missed = endUnoWindow(s, id);
            if (p.hand.length > 2) p.uno = false;
            play(s, id, card, pick);
            if (missed) s.log.missed = missed;
          }
        }
        if (msg.t === "draw" && s.drawn === null) drawTurn(s, id);
        if (msg.t === "pass" && s.drawn !== null) {
          s.drawn = null;
          s.turn = step(s, id);
        }
      }
    }
    // รอบต่อไปเริ่มเมื่อทุกคนที่ยังไม่ตกรอบกดพร้อม
    if (msg.t === "ready" && s.phase === "end" && s.order.includes(id)) {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length >= s.order.length) startRound(s);
    }
    if (id === s.owner) {
      if (msg.t === "target" && s.phase === "lobby") s.target = Math.min(1000, Math.max(50, Math.round(Number(msg.value)) || 500));
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        s.order = s.players.map((p) => p.id);
        s.dealer = null;
        s.round = 0;
        startRound(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
    if (s.phase === "play" && turnKey() !== before) s.turnEnds = now + TURN;
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
    if (s.phase === "lobby" || s.phase === "over") return;
    // เหลือคนเดียวที่ยังไม่ตกรอบ ชนะ
    if (s.order.length < 2) return finish(s, pl(s, s.order[0]));
    s.deck.unshift(...gone.hand);
    if (s.unoOpen === id) s.unoOpen = null;
    if (s.turn === id) {
      s.turn = next;
      s.drawn = null;
      s.turnEnds = Date.now() + TURN;
    }
    if (s.phase === "end") {
      s.ready = s.ready.filter((x) => x !== id);
      if (s.ready.length >= s.order.length) startRound(s);
    }
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, target: s.target,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score, out: p.out })),
    };
    if (s.phase === "lobby") return v;
    const me = pl(s, id);
    const seats = s.order.map((x) => pl(s, x));
    Object.assign(v, {
      seats: seats.map((p) => ({ id: p.id, name: p.name, count: p.hand.length, uno: p.uno, now: s.phase === "play" && s.turn === p.id })),
      hand: me.hand, top: top(s), under: s.pile.slice(-3, -1), color: s.color, pending: s.pending, dir: s.dir, deck: s.deck.length,
      shuffles: s.shuffles || 0, out: me.out,
      myTurn: s.phase === "play" && s.turn === id, drawn: s.turn === id ? s.drawn : null,
      turnName: (pl(s, s.turn) || {}).name,
      // เวลาที่เหลือของตานี้ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
      turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      // ปุ่ม UNO: เราเพิ่งเหลือ 1 ใบและยังไม่กด
      canUno: s.phase === "play" && s.unoOpen === id,
      log: s.log, result: s.result, winner: s.winner,
      ready: s.ready.includes(id), readyCount: s.ready.length, activeCount: s.order.length,
    });
    return v;
  },
};
