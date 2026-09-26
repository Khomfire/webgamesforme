// ห้องเล่นออนไลน์ผ่าน Supabase Realtime: ทุกข้อความวิ่งผ่าน server เลยเล่นได้ทุกเครือข่าย
// (เดิมใช้ PeerJS ต่อตรงระหว่างเครื่อง ซึ่งต่อไม่ติดเมื่อเน็ตคนละเครือข่าย)
// หน้าตาเหมือน PeerJS ส่วนที่เกมใช้: new Peer(id) = สร้างห้อง, new Peer() แล้ว connect(id) = เข้าห้อง
// ทุกเครื่องในห้องอยู่ใน channel เดียวกัน presence บอกว่าใครยังอยู่ broadcast ส่งข้อความ
const sb = supabase.createClient("https://btbgeqlsbtdofucjajfv.supabase.co", "sb_publishable_ThWhcYubEIjJ0qsz6utF7w_rQP-6ftx");
const GRACE = 60000; // เน็ตหลุดชั่วคราว (เช่นสลับแอปไปส่งรหัส) รอให้กลับมาก่อนถือว่าออก

class Emitter {
  constructor() { this.handlers = {}; }
  on(e, f) { (this.handlers[e] ||= []).push(f); return this; }
  once(e, f) {
    const g = (...a) => { this.handlers[e] = this.handlers[e].filter((h) => h !== g); f(...a); };
    return this.on(e, g);
  }
  emit(e, ...a) { (this.handlers[e] || []).slice().forEach((f) => f(...a)); }
}

class Conn extends Emitter {
  constructor(owner, peer) { super(); this.owner = owner; this.peer = peer; this.open = false; }
  send(data) { if (this.open) this.owner.post(this.peer, data); }
  close() {
    if (!this.open) return;
    this.open = false;
    this.emit("close");
  }
}

class Peer extends Emitter {
  constructor(id) {
    super();
    this.destroyed = false;
    this.conns = new Map();  // host: ผู้เล่นแต่ละคน, เพื่อน: ห้องที่เข้า
    this.timers = new Map(); // คนที่หลุดไป รอดูว่าจะกลับมาไหม
    if (id) {
      this.id = id;
      this.join(id, true);
    } else {
      this.id = "p" + Math.random().toString(36).slice(2, 10);
      setTimeout(() => this.emit("open", this.id));
    }
  }

  connect(room) {
    const conn = new Conn(this, room);
    this.conns.set(room, conn);
    this.join(room, false);
    return conn;
  }

  join(room, isHost) {
    this.room = room;
    this.isHost = isHost;
    const ch = (this.ch = sb.channel(room, { config: { presence: { key: this.id } } }));
    const here = (key) => key in ch.presenceState();
    let checked = false, first = true;
    // ดูครั้งแรกว่ามีห้องนี้อยู่แล้วไหม (host คือคนที่ใช้รหัสห้องเป็น presence key)
    const check = () => {
      if (checked || this.destroyed) return;
      checked = true;
      if (isHost) {
        if (here(room)) return this.fail("unavailable-id");
        ch.track({});
        this.emit("open", this.id);
      } else if (here(room)) {
        this.enter();
      } else {
        this.lookup = setTimeout(() => this.fail("peer-unavailable"), 3000);
      }
    };
    ch.on("presence", { event: "sync" }, check)
      .on("presence", { event: "join" }, ({ key }) => this.seen(key))
      .on("presence", { event: "leave" }, ({ key }) => this.gone(key))
      .on("broadcast", { event: "m" }, ({ payload }) => this.receive(payload))
      .subscribe((status) => {
        if (status !== "SUBSCRIBED" || this.destroyed) return;
        if (first) {
          first = false;
          setTimeout(check, 2000); // ปกติ presence sync มาก่อนแล้ว กันไว้เผื่อไม่มา
        } else if (checked) {
          // ต่อกลับมาหลังเน็ตหลุด: บอกว่ายังอยู่ แล้วขอสถานะล่าสุดที่อาจพลาดไป
          ch.track({});
          if (!isHost) this.post(room, { t: "sync" });
        }
      });
  }

  enter() {
    clearTimeout(this.lookup);
    const conn = this.conns.get(this.room);
    if (!conn || conn.open) return;
    this.ch.track({});
    conn.open = true;
    conn.emit("open");
  }

  seen(key) {
    if (!this.isHost && key === this.room && this.lookup) this.enter();
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
      if (!this.isHost) this.post(this.room, { t: "sync" }); // host กลับมา ขอสถานะล่าสุด
    }
  }

  gone(key) {
    if (!this.conns.has(key) || this.timers.has(key)) return;
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key);
      if (!(key in this.ch.presenceState())) this.drop(key);
    }, GRACE));
  }

  drop(key) {
    const conn = this.conns.get(key);
    this.conns.delete(key);
    if (conn) conn.close();
  }

  receive({ from, to, data, batch, bye }) {
    if (this.destroyed) return;
    if (this.isHost) {
      if (to !== this.id) return;
      if (bye) return this.drop(from);
      let conn = this.conns.get(from);
      if (!conn) {
        conn = new Conn(this, from);
        conn.open = true;
        this.conns.set(from, conn);
        this.emit("connection", conn);
      }
      conn.emit("data", data);
    } else if (from === this.room) {
      if (bye) return this.drop(from);
      const conn = this.conns.get(from);
      for (const d of (batch && batch[this.id]) || []) if (conn && conn.open) conn.emit("data", d);
    }
  }

  // host รวมข้อความถึงทุกคนในจังหวะเดียวกันเป็น broadcast เดียว ประหยัดโควตาข้อความ
  post(to, data) {
    if (!this.isHost) return this.ch.send({ type: "broadcast", event: "m", payload: { from: this.id, to, data } });
    if (!this.queue) {
      this.queue = {};
      queueMicrotask(() => {
        const batch = this.queue;
        this.queue = null;
        this.ch.send({ type: "broadcast", event: "m", payload: { from: this.id, batch } });
      });
    }
    (this.queue[to] ||= []).push(data);
  }

  fail(type) {
    this.emit("error", Object.assign(new Error(type), { type }));
    this.destroy(true);
  }

  destroy(silent) {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.lookup);
    this.timers.forEach(clearTimeout);
    if (!this.ch) return;
    if (!silent) this.ch.send({ type: "broadcast", event: "m", payload: { from: this.id, to: this.room, bye: true } });
    sb.removeChannel(this.ch);
  }
}
