// DOMINOES (Draw game): โดมิโน double-six 28 ตัว 2 คนแจกคนละ 7 ตัว 3-4 คนคนละ 5 ตัว ที่เหลือเป็นกองจั่ว
// ต่อตัวที่แต้มตรงกับปลายแถวด้านใดด้านหนึ่ง ไม่มีตัวลงต้องจั่วจนได้ตัวที่ลงได้ กองจั่วหมดแล้วลงไม่ได้ Pass
// ลงหมดมือก่อนชนะตานั้น ได้แต้มรวมของตัวที่เหลือในมือคนอื่น ไม่มีใครลงได้ (ตัน) คนแต้มในมือน้อยสุดชนะ
// แต้มถึงเป้าก่อนชนะเกม ตาแรกคนที่มีดับเบิลสูงสุดวางก่อน (ไม่มีดับเบิลใช้ตัวแต้มสูงสุด) ตาต่อไปคนชนะตาก่อนลงก่อน
// ตัวโดมิโนคือ [a, b] (a <= b ในมือ) แถวเก็บเรียงจากปลายซ้ายไปขวา แต่ละตัวหันให้ด้านที่ติดกันแต้มตรงกัน
const pl = (s, id) => s.players.find((p) => p.id === id);
const pips = (t) => t[0] + t[1];
const sum = (hand) => hand.reduce((m, t) => m + pips(t), 0);
const same = (x, y) => x[0] === y[0] && x[1] === y[1];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ต่อได้ปลายไหนบ้าง: "L" ซ้าย "R" ขวา แถวยังว่างลงได้เลย (นับเป็น "R") ปลายสองข้างแต้มเท่ากันนับข้างเดียว
// (หน้าเกมมีสำเนาไว้เปิดปิดตัวในมือ ต้องแก้ให้ตรงกัน)
export function ends(tile, line) {
  if (!line.length) return ["R"];
  const l = line[0][0], r = line[line.length - 1][1], out = [];
  if (tile.includes(l)) out.push("L");
  if (tile.includes(r) && !(l === r && out.length)) out.push("R");
  return out;
}
const canPlay = (s, p) => p.hand.some((t) => ends(t, s.line).length);

const step = (s, from, k = 1) => s.order[(s.order.indexOf(from) + k) % s.order.length];

function place(s, p, tile, end) {
  p.hand = p.hand.filter((t) => !same(t, tile));
  if (!s.line.length) s.line.push(tile);
  else if (end === "L") s.line.unshift(tile[1] === s.line[0][0] ? tile : [tile[1], tile[0]]);
  else s.line.push(tile[0] === s.line[s.line.length - 1][1] ? tile : [tile[1], tile[0]]);
  s.log = { t: "play", by: p.id, tile, end: s.line.length === 1 ? null : end, pass: [] };
  if (!p.hand.length) endHand(s, p.id, "domino");
  else advance(s, p.id);
}

// ตาถัดไป: คนที่ลงไม่ได้และกองจั่วหมดแล้ว Pass ให้เลย วนครบทุกคน (รวมคนที่เพิ่งเล่น) แล้วไม่มีใครลงได้ = ตัน
function advance(s, from) {
  for (let k = 1; k <= s.order.length; k++) {
    const id = step(s, from, k);
    if (s.boneyard.length || canPlay(s, pl(s, id))) {
      s.turn = id;
      return;
    }
    if (id !== from) s.log.pass.push(id);
  }
  // ตัน: คนแต้มในมือน้อยสุดชนะ เสมอกันไม่มีใครได้แต้ม
  const low = Math.min(...s.order.map((id) => sum(pl(s, id).hand)));
  const best = s.order.filter((id) => sum(pl(s, id).hand) === low);
  endHand(s, best.length === 1 ? best[0] : null, "blocked");
}

// จั่วทีละตัวจนได้ตัวที่ลงได้ กองจั่วหมดแล้วยังลงไม่ได้ Pass
function drawTurn(s, p) {
  let n = 0;
  while (s.boneyard.length && !canPlay(s, p)) {
    p.hand.push(s.boneyard.pop());
    n++;
  }
  s.log = { t: "draw", by: p.id, n, pass: [] };
  if (!canPlay(s, p)) {
    s.log.pass.push(p.id);
    advance(s, p.id);
  }
}

function startHand(s) {
  const all = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]);
  shuffle(all);
  const n = s.order.length === 2 ? 7 : 5;
  for (const id of s.order) pl(s, id).hand = all.splice(0, n);
  Object.assign(s, { phase: "play", boneyard: all, line: [], result: null, ready: [], log: null, deal: s.deal + 1 });
  // คนชนะตาก่อนลงตัวไหนก็ได้
  if (s.leader && s.order.includes(s.leader)) {
    s.turn = s.leader;
    return;
  }
  // ตาแรก (หรือตาก่อนเสมอ): ดับเบิลสูงสุดวางก่อน ไม่มีใครมีดับเบิลใช้ตัวแต้มสูงสุด
  const held = s.order.flatMap((id) => pl(s, id).hand.map((t) => ({ id, t })));
  const rank = ({ t }) => (t[0] === t[1] ? 1000 : 0) + pips(t) * 10 + t[1];
  const first = held.reduce((m, x) => (rank(x) > rank(m) ? x : m));
  place(s, pl(s, first.id), first.t, "R");
  s.log.t = "set";
}

function endHand(s, id, how) {
  const others = s.order.filter((x) => x !== id);
  const pts = id ? others.reduce((m, x) => m + sum(pl(s, x).hand), 0) : 0;
  if (id) pl(s, id).score += pts;
  s.result = {
    how, pts, winner: id && pl(s, id).name,
    hands: s.order.map((x) => pl(s, x)).map((p) => ({ name: p.name, tiles: p.hand, pips: sum(p.hand) })),
  };
  s.leader = id;
  s.turn = null;
  const top = id && pl(s, id);
  if (top && top.score >= s.target) finish(s, top);
  else s.phase = "end";
}

function finish(s, p) {
  s.phase = "over";
  s.winner = p.name;
}

// หมดเวลา: มีตัวลงได้ลงตัวแต้มสูงสุด ไม่มีก็จั่ว
function timeUp(s) {
  const p = pl(s, s.turn);
  const ok = p.hand.filter((t) => ends(t, s.line).length).sort((x, y) => pips(y) - pips(x));
  if (ok.length) place(s, p, ok[0], ends(ok[0], s.line)[0]);
  else drawTurn(s, p);
  s.log.late = p.id;
}

// เอาออกจากเกม (ออกจากห้องหรือยอมแพ้): ตัวในมือกลับเข้ากองจั่ว ถ้าเป็นตาเขาไปคนถัดไป เหลือคนเดียวชนะ
function drop(s, id, hand) {
  const next = step(s, id);
  s.order = s.order.filter((x) => x !== id);
  if (s.leader === id) s.leader = null;
  if (s.order.length < 2) return finish(s, pl(s, s.order[0]));
  if (s.phase === "play") {
    s.boneyard.push(...hand);
    shuffle(s.boneyard);
    if (s.turn === id) s.turn = next;
  }
  if (s.phase === "end") {
    s.ready = s.ready.filter((x) => x !== id);
    if (s.ready.length >= s.order.length) startHand(s);
  }
}

function toLobby(s) {
  for (const p of s.players) Object.assign(p, { hand: [], score: 0 });
  s.phase = "lobby";
}

// ลงตัวใหม่ จั่ว หรือตาเปลี่ยน เริ่มนับเวลาใหม่
const turnKey = (s) => [s.phase, s.turn, s.deal, s.line && s.line.length, s.boneyard && s.boneyard.length].join();

export default {
  max: 4,
  init: () => ({ target: 100, time: 15000, phase: "lobby" }),
  player: () => ({ hand: [], score: 0 }),
  canResign: (s, id) => (s.phase === "play" || s.phase === "end") && s.order.includes(id),

  handle(s, id, msg, now) {
    const key = turnKey(s);
    const p = pl(s, id);
    // ยอมแพ้: ออกจากเกมนี้ (ยังดูอยู่ในห้องได้) ตัวในมือกลับเข้ากองจั่ว
    if (msg.t === "resign") {
      const hand = p.hand;
      p.hand = [];
      drop(s, id, hand);
    }
    if (s.phase === "play") {
      // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
      if (msg.t === "timeout" && now >= s.turnEnds) timeUp(s);
      else if (s.turn === id) {
        const tile = Array.isArray(msg.tile) && p.hand.find((t) => same(t, msg.tile));
        if (msg.t === "play" && tile && ends(tile, s.line).includes(msg.end)) place(s, p, tile, msg.end);
        if (msg.t === "draw" && s.boneyard.length && !canPlay(s, p)) drawTurn(s, p);
      }
    }
    // ตาต่อไปเริ่มเมื่อทุกคนกดพร้อม
    if (msg.t === "ready" && s.phase === "end" && s.order.includes(id)) {
      if (!s.ready.includes(id)) s.ready.push(id);
      if (s.ready.length >= s.order.length) startHand(s);
    }
    if (id === s.owner) {
      if (msg.t === "target" && s.phase === "lobby") s.target = Math.min(300, Math.max(50, Math.round(Number(msg.value)) || 100));
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(60, Math.max(5, Math.round(Number(msg.value)) || 15)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        toLobby(s);
        Object.assign(s, { order: s.players.map((x) => x.id), deal: 0, leader: null, winner: null });
        startHand(s);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
    if (turnKey(s) !== key) s.turnEnds = now + s.time;
  },

  // คนออก
  leave(s, id, gone) {
    if (s.phase === "lobby" || s.phase === "over" || !s.order.includes(id)) return;
    const key = turnKey(s);
    drop(s, id, gone.hand);
    if (turnKey(s) !== key) s.turnEnds = Date.now() + s.time;
  },

  view(s, id, now) {
    const v = {
      screen: s.phase, target: s.target, time: s.time,
      players: s.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    };
    if (s.phase === "lobby") return v;
    const me = pl(s, id);
    const myTurn = s.phase === "play" && s.turn === id;
    Object.assign(v, {
      seats: s.order.map((x) => pl(s, x)).map((p) => ({ id: p.id, name: p.name, count: p.hand.length, score: p.score })),
      hand: me.hand, line: s.line, boneyard: s.boneyard.length, turn: s.turn, myTurn,
      canDraw: myTurn && s.boneyard.length > 0 && !canPlay(s, me),
      // เวลาที่เหลือของตานี้ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน)
      turnLeft: s.phase === "play" ? Math.max(0, s.turnEnds - now) : null,
      log: s.log, result: s.result, winner: s.winner, deal: s.deal,
      ready: s.ready.includes(id), readyCount: s.ready.length, activeCount: s.order.length,
    });
    return v;
  },
};
