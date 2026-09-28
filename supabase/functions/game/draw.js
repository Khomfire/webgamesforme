// DRAW & GUESS: ผลัดกันวาดตามคำที่เลือก คนอื่นพิมพ์ทาย ทายถูกเร็วได้แต้มมาก คนวาดได้ครึ่งหนึ่งของแต้มคนที่ทายถูก
// รอบหนึ่งทุกคนได้วาดคนละครั้ง ครบจำนวนรอบ แต้มมากสุดชนะ
// เส้นที่วาดไม่ผ่าน server: เครื่องคนวาดส่งตรงถึงเครื่องอื่นทาง Realtime (ดู ink ใน net.js) server ดูแลคำ แต้ม และเวลา
const WORDS = [
  // สัตว์
  "แมว", "หมา", "ช้าง", "ม้า", "วัว", "ควาย", "หมู", "ไก่", "เป็ด", "ปลา", "กุ้ง", "ปู", "ปลาหมึก", "เต่า", "กบ", "งู", "จระเข้", "ลิง", "เสือ",
  "สิงโต", "ยีราฟ", "ม้าลาย", "หมี", "แพนด้า", "กระต่าย", "หนู", "นก", "นกฮูก", "เพนกวิน", "ฉลาม", "วาฬ", "โลมา", "ผีเสื้อ", "ผึ้ง", "มด",
  "แมงมุม", "ยุง", "หอยทาก", "ไดโนเสาร์", "มังกร", "ยูนิคอร์น", "อูฐ", "จิงโจ้", "แกะ", "แพะ", "ค้างคาว", "หงส์", "นกยูง", "แมงกะพรุน", "ปลาดาว",
  // อาหารและผลไม้
  "ข้าวผัด", "ส้มตำ", "ต้มยำกุ้ง", "ผัดไทย", "ไข่ดาว", "หมูกระทะ", "ซูชิ", "พิซซ่า", "แฮมเบอร์เกอร์", "ฮอทดอก", "เฟรนช์ฟรายส์", "ไอศกรีม",
  "เค้ก", "โดนัท", "คุกกี้", "ขนมปัง", "แซนด์วิช", "ก๋วยเตี๋ยว", "ข้าวเหนียวมะม่วง", "ลูกชิ้น", "ไก่ทอด", "ชานมไข่มุก", "กาแฟ", "ป๊อปคอร์น",
  "แตงโม", "กล้วย", "แอปเปิ้ล", "ส้ม", "องุ่น", "สับปะรด", "มะพร้าว", "ทุเรียน", "มะม่วง", "สตรอว์เบอร์รี่", "ข้าวโพด", "แครอท", "มะเขือเทศ",
  "พริก", "เห็ด", "ไข่",
  // ของใช้
  "ร่ม", "นาฬิกา", "แว่นตา", "หมวก", "รองเท้า", "กระเป๋า", "เสื้อ", "กางเกง", "ถุงเท้า", "เนคไท", "โทรศัพท์", "คอมพิวเตอร์", "ทีวี",
  "กล้องถ่ายรูป", "หูฟัง", "ไมโครโฟน", "กีตาร์", "กลอง", "เปียโน", "ไวโอลิน", "หลอดไฟ", "เทียน", "กุญแจ", "กรรไกร", "ดินสอ", "ยางลบ",
  "ไม้บรรทัด", "หนังสือ", "จดหมาย", "กล่องของขวัญ", "ลูกโป่ง", "ว่าว", "ตุ๊กตา", "หุ่นยนต์", "ลูกบอล", "ช้อน", "ส้อม", "ตะเกียบ", "จาน",
  "แก้วน้ำ", "ขวด", "หม้อ", "กระทะ", "มีด", "ตู้เย็น", "พัดลม", "เตียง", "หมอน", "โซฟา", "เก้าอี้", "โต๊ะ", "ประตู", "หน้าต่าง", "บันได",
  "กระจก", "แปรงสีฟัน", "สบู่", "ไม้กวาด", "ถังขยะ", "ค้อน", "ตะปู", "เลื่อย", "สมอเรือ", "ธง", "มงกุฎ", "แหวน", "ลิปสติก", "หวี", "ไดร์เป่าผม",
  "ปฏิทิน", "แผนที่", "เข็มทิศ", "กล้องส่องทางไกล", "ร่มชูชีพ", "ครก", "ปิ่นโต", "พวงมาลัย", "กระทง",
  // ยานพาหนะ
  "รถยนต์", "รถเมล์", "รถไฟ", "เครื่องบิน", "เฮลิคอปเตอร์", "เรือ", "เรือดำน้ำ", "จักรยาน", "มอเตอร์ไซค์", "ตุ๊กตุ๊ก", "รถบรรทุก", "รถดับเพลิง",
  "รถพยาบาล", "จรวด", "สเก็ตบอร์ด", "บอลลูน", "รถไฟเหาะ",
  // สถานที่และธรรมชาติ
  "บ้าน", "โรงเรียน", "โรงพยาบาล", "วัด", "ปราสาท", "ภูเขา", "ภูเขาไฟ", "ทะเล", "เกาะ", "น้ำตก", "แม่น้ำ", "สะพาน", "ทะเลทราย", "ถ้ำ",
  "พระอาทิตย์", "พระจันทร์", "ดาว", "ดาวตก", "รุ้ง", "เมฆ", "ฝน", "หิมะ", "ฟ้าผ่า", "ต้นไม้", "ดอกไม้", "ดอกทานตะวัน", "กระบองเพชร",
  "ใบไม้", "ไฟ", "ลูกโลก", "ประภาคาร", "เต็นท์", "ชิงช้าสวรรค์", "ตึกระฟ้า", "พีระมิด", "หอไอเฟล",
  // คนและตัวละคร
  "ตำรวจ", "หมอ", "ครู", "นักบิน", "ทหาร", "ชาวนา", "พ่อครัว", "นักบินอวกาศ", "โจรสลัด", "นินจา", "ซอมบี้", "ผี", "แม่มด", "นางเงือก",
  "ซูเปอร์ฮีโร่", "ตัวตลก", "เจ้าหญิง", "ราชา", "มนุษย์หิมะ", "ซานตาคลอส", "มนุษย์ต่างดาว",
  // ท่าทาง
  "ว่ายน้ำ", "วิ่ง", "กระโดด", "นอน", "ร้องไห้", "หัวเราะ", "เต้น", "ร้องเพลง", "ตกปลา", "ปีนเขา", "ขี่ม้า", "อาบน้ำ", "แปรงฟัน", "ทำอาหาร",
  "เซลฟี่", "เตะบอล", "ยิงธนู", "จาม", "หาว", "กอด", "ชกมวย", "ปลูกต้นไม้", "สงกรานต์", "ลอยกระทง",
  // ร่างกาย
  "ตา", "หู", "จมูก", "ปาก", "ฟัน", "มือ", "เท้า", "หัวใจ", "สมอง", "กระดูก", "หนวด",
];
const TURN = 80000; // เวลาวาดต่อตา (ค่าเริ่มต้น เจ้าของห้องตั้งได้ 30-180 วิ)
const CHOOSE = 15000; // เวลาเลือกคำ หมดเวลาสุ่มให้
const REVEAL = 5000; // เฉลยคำก่อนไปตาถัดไป
const CHAT = 40; // เก็บข้อความทายล่าสุดกี่อัน
const pl = (s, id) => s.players.find((p) => p.id === id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// เทียบคำทาย: ไม่สนเว้นวรรคและตัวพิมพ์เล็กใหญ่
const clean = (t) => String(t || "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
// ตัวอักษรที่เห็นเป็นหนึ่งช่อง (สระบนล่างและวรรณยุกต์ติดกับพยัญชนะ)
const letters = (w) => [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(w)].map((x) => x.segment);
const guessers = (s) => s.players.filter((p) => p.id !== s.drawer);

// ตาถัดไป: คนแรกตามลำดับเข้าห้องที่ยังไม่ได้วาดในรอบนี้ ครบทุกคนขึ้นรอบใหม่ ครบจำนวนรอบจบเกม
function nextTurn(s, now) {
  let next = s.players.find((p) => !s.drawn.includes(p.id));
  if (!next) {
    if (s.round >= s.rounds) return finish(s);
    s.round++;
    s.drawn = [];
    next = s.players[0];
  }
  s.drawn.push(next.id);
  const fresh = WORDS.filter((w) => !s.used.includes(w));
  const options = [];
  while (options.length < 3) {
    const w = pick(fresh.length >= 3 ? fresh : WORDS);
    if (!options.includes(w)) options.push(w);
  }
  Object.assign(s, { phase: "choose", drawer: next.id, options, word: null, guessed: [], gains: {}, chat: [], turnNo: s.turnNo + 1, turnEnds: now + CHOOSE });
}

function choose(s, word, now) {
  s.word = word;
  s.used.push(word);
  // ลำดับช่องที่จะเปิดใบ้ (ไม่นับเว้นวรรค)
  s.hints = letters(word).map((ch, i) => (ch.trim() ? i : -1)).filter((i) => i >= 0).sort(() => Math.random() - 0.5);
  s.phase = "draw";
  s.turnEnds = now + s.time;
}

function endTurn(s, now) {
  s.phase = "reveal";
  s.turnEnds = now + REVEAL;
}

function finish(s) {
  s.phase = "over";
  s.drawer = null;
}

// แต้มคนทาย 50-500 ตามเวลาที่เหลือ (ปัดหลักสิบ) คนวาดได้ครึ่งหนึ่ง
function guess(s, id, text, now) {
  const p = pl(s, id);
  if (clean(text) !== clean(s.word)) {
    s.chat.push({ name: p.name, text });
  } else {
    const left = Math.max(0, s.turnEnds - now);
    const pts = Math.round((50 + (450 * left) / s.time) / 10) * 10;
    const half = Math.round(pts / 20) * 10;
    p.score += pts;
    s.gains[id] = pts;
    pl(s, s.drawer).score += half;
    s.gains[s.drawer] = (s.gains[s.drawer] || 0) + half;
    s.guessed.push(id);
    s.chat.push({ name: p.name, ok: true });
  }
  s.chat = s.chat.slice(-CHAT);
  if (guessers(s).every((x) => s.guessed.includes(x.id))) endTurn(s, now);
}

// ใบ้: ผ่านครึ่งเวลาเปิด 1 ช่อง ผ่าน 3/4 เปิดอีก 1 ช่อง แต่ไม่เกินครึ่งคำ
function hint(s, now) {
  const done = 1 - Math.max(0, s.turnEnds - now) / s.time;
  const open = Math.min((done >= 0.5) + (done >= 0.75), Math.floor((s.hints.length - 1) / 2));
  const shown = new Set(s.hints.slice(0, open));
  return letters(s.word).map((ch, i) => (!ch.trim() ? " " : shown.has(i) ? ch : null));
}

function toLobby(s) {
  for (const p of s.players) p.score = 0;
  Object.assign(s, { phase: "lobby", drawer: null, word: null });
}

export default {
  max: 10,
  lateJoin: true, // เข้ากลางเกมได้ ทายได้เลย และได้วาดเมื่อถึงคิว
  init: () => ({ rounds: 3, time: TURN, phase: "lobby", turnNo: 0 }),
  player: () => ({ score: 0 }),

  handle(s, id, msg, now) {
    // ใครก็แจ้งได้ว่าหมดเวลา server เช็กเวลาเอง
    if (msg.t === "timeout" && now >= s.turnEnds) {
      if (s.phase === "choose") choose(s, pick(s.options), now);
      else if (s.phase === "draw") endTurn(s, now);
      else if (s.phase === "reveal") nextTurn(s, now);
    }
    if (msg.t === "choose" && s.phase === "choose" && id === s.drawer && s.options.includes(msg.word)) choose(s, msg.word, now);
    if (msg.t === "guess" && s.phase === "draw" && id !== s.drawer && !s.guessed.includes(id)) {
      const text = String(msg.text || "").trim().slice(0, 40);
      if (text) guess(s, id, text, now);
    }
    if (id === s.owner) {
      if (msg.t === "rounds" && s.phase === "lobby") s.rounds = Math.min(10, Math.max(1, Math.round(Number(msg.value)) || 3));
      if (msg.t === "time" && s.phase === "lobby") s.time = Math.min(180, Math.max(30, Math.round(Number(msg.value)) || 80)) * 1000;
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 2) {
        for (const p of s.players) p.score = 0;
        Object.assign(s, { round: 1, drawn: [], used: [] });
        nextTurn(s, now);
      }
      if (msg.t === "newgame" && s.phase === "over") toLobby(s);
    }
  },

  // คนวาดออก: ยังไม่ได้เลือกคำข้ามไปตาถัดไป วาดอยู่ก็เฉลยเลย คนทายออกแล้วที่เหลือทายถูกครบก็เฉลย
  leave(s, id) {
    if (s.phase === "lobby" || s.phase === "over") return;
    const now = Date.now();
    if (s.players.length < 2) return toLobby(s);
    if (id === s.drawer && s.phase === "choose") nextTurn(s, now);
    else if (id === s.drawer && s.phase === "draw") endTurn(s, now);
    else if (s.phase === "draw" && guessers(s).every((x) => s.guessed.includes(x.id))) endTurn(s, now);
  },

  view(s, id, now) {
    const playing = s.phase === "choose" || s.phase === "draw";
    const v = {
      screen: s.phase, rounds: s.rounds, time: s.time,
      players: s.players.map((p) => ({
        name: p.name, score: p.score, now: playing && p.id === s.drawer,
        guessed: s.phase === "draw" && s.guessed.includes(p.id), gain: (s.phase === "reveal" && s.gains[p.id]) || 0,
      })),
    };
    if (s.phase === "lobby") return v;
    const drawer = pl(s, s.drawer);
    Object.assign(v, {
      round: s.round, turnNo: s.turnNo, drawerName: drawer ? drawer.name : "", iDraw: id === s.drawer,
      chat: s.chat, guessed: s.guessed.includes(id),
      // เวลาที่เหลือ (ส่งเป็นระยะเวลา ไม่ใช่เวลานาฬิกา เผื่อนาฬิกาเครื่องไม่ตรงกัน) และเวลาเต็มของช่วงนี้
      turnLeft: s.phase === "over" ? null : Math.max(0, s.turnEnds - now),
      limit: { choose: CHOOSE, draw: s.time, reveal: REVEAL }[s.phase],
    });
    if (s.phase === "choose" && v.iDraw) v.options = s.options;
    // เห็นคำเต็ม: คนวาด คนที่ทายถูกแล้ว และทุกคนตอนเฉลย
    if (s.phase === "draw" && (v.iDraw || v.guessed)) v.word = s.word;
    if (s.phase === "draw" && !v.word) v.hint = hint(s, now);
    if (s.phase === "reveal" || s.phase === "over") v.word = s.word;
    if (s.phase === "reveal") v.gains = Object.entries(s.gains).map(([x, n]) => ({ name: (pl(s, x) || {}).name, n })).filter((g) => g.name).sort((a, b) => b.n - a.n);
    if (s.phase === "over") {
      const top = Math.max(...s.players.map((p) => p.score));
      v.winners = s.players.filter((p) => p.score === top).map((p) => p.name);
    }
    return v;
  },
};
