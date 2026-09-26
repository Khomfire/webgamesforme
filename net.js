// ต่อห้องเกมที่ server (Supabase Edge Function "game" เป็นตัวคุมเกม)
// ส่งคำสั่งด้วย fetch แล้วรับสถานะของตัวเองทางช่อง Realtime "p:<token>" ที่รู้แค่เครื่องนี้
// ช่อง "r:<code>" ใช้ presence ดูว่าใครยังอยู่ ใครไม่อยู่นานเกิน GRACE ก็แจ้ง server ให้เอาออก
const SUPABASE_URL = "https://btbgeqlsbtdofucjajfv.supabase.co";
const sb = supabase.createClient(SUPABASE_URL, "sb_publishable_ThWhcYubEIjJ0qsz6utF7w_rQP-6ftx");
const GAME_FN = SUPABASE_URL + "/functions/v1/game";
const GRACE = 60000; // เน็ตหลุดชั่วคราว (เช่นสลับแอปไปส่งรหัส) รอให้กลับมาก่อนถือว่าออก

// ห้องที่อยู่ล่าสุดของแท็บนี้ รีเฟรชแล้วยังอยู่ (sessionStorage หายเมื่อปิดแท็บ)
const roomKey = (game) => "wgfm-room-" + game;
function savedRoom(game) {
  try { return JSON.parse(sessionStorage.getItem(roomKey(game))); } catch { return null; }
}

// onView(view) ทุกครั้งที่สถานะเปลี่ยน, onError(ข้อความ) เมื่อเข้าห้องไม่ได้หรือไม่ได้อยู่ในห้องแล้ว
// saved = { code, token } จาก savedRoom() เพื่อกลับเข้าห้องเดิมหลังรีเฟรช
function openRoom(game, onView, onError, saved) {
  const token = saved ? saved.token : [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  let code = saved ? saved.code : null, seq = -1, last = "", closed = false, inRoom = false, watch = null, ids = [];
  const timers = new Map();

  const close = (error) => {
    if (closed) return;
    closed = true;
    try { sessionStorage.removeItem(roomKey(game)); } catch {}
    timers.forEach(clearTimeout);
    sb.removeChannel(mine);
    if (watch) sb.removeChannel(watch);
    if (error) onError(error);
  };

  // สถานะเดียวกันมาทั้งทางคำตอบของ fetch และทาง Realtime ใช้อันแรก ไม่วาดซ้ำ (วาดซ้ำจะตัดแอนิเมชันกลางคัน)
  const apply = (v) => {
    const json = JSON.stringify(v);
    if (closed || v.seq < seq || json === last) return; // มาช้ากว่าสถานะที่มีอยู่แล้ว หรือซ้ำ
    seq = v.seq;
    last = json;
    code = v.code;
    ids = v.ids;
    inRoom = true;
    try { sessionStorage.setItem(roomKey(game), JSON.stringify({ code, token })); } catch {}
    if (!watch) watchRoom(v.me);
    else checkAbsent();
    onView(v);
  };

  // ส่งเป็น text/plain เบราว์เซอร์จะไม่ต้องถามก่อนส่ง (ไม่มี CORS preflight) เร็วขึ้นหนึ่งรอบ
  const call = async (msg) => {
    if (closed) return;
    try {
      const res = await fetch(GAME_FN, { method: "POST", body: JSON.stringify({ game, code, token, msg }), signal: AbortSignal.timeout(15000) });
      const out = await res.json();
      if (out.view) apply(out.view);
      else if (out.error) close(out.error);
    } catch {
      if (!inRoom) close("เชื่อมต่อไม่สำเร็จ"); // ระหว่างเล่น เน็ตหลุดแป๊บเดียวไม่ต้องออก กดใหม่ได้
    }
  };

  const mine = sb.channel("p:" + token).on("broadcast", { event: "view" }, ({ payload }) => apply(payload));
  let first = true;
  const ready = new Promise((resolve) => mine.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    if (first) { first = false; resolve(); }
    else if (inRoom) call({ t: "sync" }); // ต่อกลับมาหลังเน็ตหลุด ขอสถานะล่าสุดที่อาจพลาดไป
  }));
  setTimeout(() => first && close("เชื่อมต่อไม่สำเร็จ"), 15000);

  // ผู้เล่นในห้องที่ไม่อยู่ใน presence (หลุด ปิดแท็บ หรือหายไปก่อนเราเข้าห้อง) เกิน GRACE ก็แจ้ง server
  let me = null, synced = false;
  function checkAbsent() {
    if (!synced) return;
    const here = watch.presenceState();
    for (const [id, t] of timers) if (id in here || !ids.includes(id)) { clearTimeout(t); timers.delete(id); }
    for (const id of ids) {
      if (id === me || id in here || timers.has(id)) continue;
      timers.set(id, setTimeout(() => {
        timers.delete(id);
        if (!(id in watch.presenceState())) call({ t: "gone", id });
      }, GRACE));
    }
  }

  function watchRoom(id) {
    me = id;
    watch = sb.channel("r:" + code, { config: { presence: { key: me } } });
    let joined = false;
    watch
      .on("presence", { event: "sync" }, () => { synced = true; checkAbsent(); })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        watch.track({});
        if (joined) call({ t: "sync" });
        joined = true;
      });
  }

  return {
    // รอให้ช่องรับสถานะพร้อมก่อน จะได้ไม่พลาดสถานะแรก
    create: (name) => ready.then(() => call({ t: "create", name })),
    join: (roomCode, name) => { code = roomCode; return ready.then(() => call({ t: "join", name })); },
    resume: () => ready.then(() => call({ t: "sync" })),
    send: (msg) => call(msg),
    // ออกจากห้อง: sendBeacon ส่งได้แม้หน้ากำลังเปลี่ยน
    leave() {
      if (closed) return;
      if (inRoom) navigator.sendBeacon(GAME_FN, JSON.stringify({ game, code, token, msg: { t: "leave" } }));
      close();
    },
  };
}
