// CODENAMES: สองทีม RED กับ BLUE ทีมละหนึ่ง Spymaster ที่เหลือเป็น Operative
// การ์ดคำ 25 ใบ ทีมที่เริ่มก่อนมี Agent 9 ใบ อีกทีม 8 ใบ Bystander 7 ใบ Assassin 1 ใบ มีแค่ Spymaster ที่เห็นเฉลย
// Spymaster ให้ Clue คำเดียวกับตัวเลข Operative เปิดการ์ดได้ไม่เกินตัวเลข +1 ใบ เปิด Agent ของทีมครบก่อนชนะ เปิดเจอ Assassin แพ้ทันที
const WORDS = [
  // สัตว์
  "แมว", "หมา", "ช้าง", "ม้า", "วัว", "หมู", "ไก่", "ปลา", "กุ้ง", "ปู", "หมึก", "เต่า", "กบ", "งู", "ลิง", "เสือ", "สิงโต", "หมี", "กระต่าย",
  "หนู", "นก", "ฉลาม", "วาฬ", "ผึ้ง", "มด", "แมงมุม", "ยุง", "ค้างคาว", "หงส์", "มังกร", "ไดโนเสาร์", "ยีราฟ", "อูฐ", "จระเข้", "นกฮูก",
  "เพนกวิน", "ผีเสื้อ", "แพนด้า", "ม้าลาย", "จิงโจ้",
  // อาหาร
  "ข้าว", "ไข่", "นม", "เค้ก", "พิซซ่า", "ส้มตำ", "กาแฟ", "ชา", "ขนมปัง", "ไอศกรีม", "กล้วย", "ส้ม", "ทุเรียน", "มะม่วง", "แตงโม", "มะพร้าว",
  "องุ่น", "พริก", "เกลือ", "น้ำตาล", "น้ำผึ้ง", "ช็อกโกแลต", "ถั่ว", "เบียร์", "บะหมี่",
  // ของใช้
  "ร่ม", "นาฬิกา", "แว่นตา", "หมวก", "รองเท้า", "กระเป๋า", "เสื้อ", "ถุงมือ", "มือถือ", "ทีวี", "กล้อง", "กีตาร์", "กลอง", "เปียโน", "หลอดไฟ",
  "เทียน", "กุญแจ", "กรรไกร", "ดินสอ", "หนังสือ", "จดหมาย", "ของขวัญ", "ลูกโป่ง", "ว่าว", "ตุ๊กตา", "หุ่นยนต์", "ลูกบอล", "ช้อน", "ตะเกียบ",
  "จาน", "แก้ว", "ขวด", "หม้อ", "มีด", "ตู้เย็น", "พัดลม", "เตียง", "หมอน", "เก้าอี้", "โต๊ะ", "ประตู", "หน้าต่าง", "บันได", "กระจก", "สบู่",
  "ไม้กวาด", "ค้อน", "ตะปู", "สมอ", "ธง", "มงกุฎ", "แหวน", "หวี", "ปฏิทิน", "แผนที่", "เข็มทิศ", "เข็ม", "เชือก", "โซ่", "ระฆัง", "ปืน", "ดาบ",
  "โล่", "ธนู", "ลูกเต๋า", "ไพ่", "หมากรุก", "เหรียญ", "บัตร", "ตั๋ว", "กล่อง", "ถุง", "หน้ากาก", "ปากกา", "ยางลบ", "ไม้เท้า",
  // ยานพาหนะ
  "รถ", "รถไฟ", "เครื่องบิน", "เรือ", "จักรยาน", "ตุ๊กตุ๊ก", "จรวด", "รถถัง", "ลิฟต์", "รถเมล์", "มอเตอร์ไซค์",
  // สถานที่
  "บ้าน", "โรงเรียน", "โรงพยาบาล", "วัด", "ปราสาท", "ภูเขา", "ทะเล", "เกาะ", "น้ำตก", "แม่น้ำ", "สะพาน", "ทะเลทราย", "ถ้ำ", "ป่า", "ตลาด",
  "ธนาคาร", "สนามบิน", "สวนสัตว์", "คุก", "ครัว", "ห้องสมุด", "โรงหนัง", "สนาม", "ฟาร์ม", "ท่าเรือ", "ขั้วโลก", "อวกาศ", "ห้องน้ำ", "สวน",
  // ธรรมชาติ
  "พระอาทิตย์", "ดวงจันทร์", "ดาว", "รุ้ง", "เมฆ", "ฝน", "หิมะ", "ฟ้าผ่า", "ลม", "ไฟ", "น้ำ", "ดิน", "หิน", "ทราย", "น้ำแข็ง", "ต้นไม้",
  "ดอกไม้", "ใบไม้", "หญ้า", "ไผ่", "กุหลาบ", "บัว", "เพชร", "ทอง", "เงิน", "เหล็ก", "คลื่น", "ภูเขาไฟ", "พายุ", "หมอก",
  // คน
  "ตำรวจ", "หมอ", "ครู", "นักบิน", "ทหาร", "ชาวนา", "พ่อครัว", "โจรสลัด", "นินจา", "ซอมบี้", "ผี", "แม่มด", "นางเงือก", "ตัวตลก",
  "เจ้าหญิง", "ราชา", "ราชินี", "นักสืบ", "ขโมย", "ยักษ์", "นางฟ้า", "ทารก", "นักมวย", "หมอดู", "ซานต้า",
  // ร่างกาย
  "ตา", "หู", "จมูก", "ปาก", "ฟัน", "มือ", "เท้า", "หัวใจ", "สมอง", "กระดูก", "หนวด", "ผม", "เลือด",
  // อื่นๆ
  "เวลา", "ความฝัน", "เงา", "เสียง", "เพลง", "รูป", "กระดาษ", "สี", "ปาร์ตี้", "งานแต่ง", "สงคราม", "ละคร", "ข่าว", "เกม", "ฟุตบอล",
  "วันเกิด", "ปีใหม่", "สงกรานต์", "เน็ต", "ไวรัส", "ยา", "ระเบิด", "ประเทศ", "โลก", "ไข้", "หัวเราะ", "น้ำตา", "จูบ", "พระ", "เอเลี่ยน",
];
const TEAMS = ["red", "blue"];
const other = (t) => (t === "red" ? "blue" : "red");
const pl = (s, id) => s.players.find((p) => p.id === id);
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// เทียบ Clue กับคำบนกระดาน: ไม่สนตัวพิมพ์เล็กใหญ่
const clean = (t) => String(t || "").normalize("NFC").toLowerCase().trim();
const members = (s, team) => s.players.filter((p) => p.team === team);
// Agent ของทีมที่ยังไม่ถูกเปิด
const agentsLeft = (s, team) => s.board.filter((c) => c.k === team && !c.r).length;

// ทีมพร้อมเริ่ม: มีอย่างน้อย 2 คน และมี Spymaster 1 คน
const ready = (s, team) => members(s, team).length >= 2 && members(s, team).some((p) => p.spy);

function start(s) {
  const first = TEAMS[Math.floor(Math.random() * 2)];
  const keys = [...Array(9).fill(first), ...Array(8).fill(other(first)), ...Array(7).fill("n"), "x"];
  const words = shuffle([...WORDS]).slice(0, 25);
  Object.assign(s, {
    phase: "clue", first, turn: first, clue: null, left: null, guesses: 0, clues: [], last: null, winner: null, why: null,
    board: shuffle(keys).map((k, i) => ({ w: words[i], k, r: false })),
  });
}

function endTurn(s) {
  Object.assign(s, { phase: "clue", turn: other(s.turn), clue: null, left: null, guesses: 0 });
}

function win(s, team, why) {
  Object.assign(s, { phase: "over", winner: team, why });
}

// เปิดการ์ด: ของทีมตัวเองเปิดต่อได้ (จนครบจำนวน) ที่เหลือจบตา Assassin แพ้ทันที
// Agent ของทีมไหนถูกเปิดครบ ทีมนั้นชนะ แม้อีกทีมเป็นคนเปิด
function guess(s, i) {
  const c = s.board[i];
  c.r = true;
  s.last = i;
  s.guesses++;
  if (c.k === "x") return win(s, other(s.turn), "x");
  for (const t of TEAMS) if (agentsLeft(s, t) === 0) return win(s, t, "all");
  if (c.k !== s.turn) return endTurn(s);
  if (s.left !== null && --s.left === 0) endTurn(s);
}

function toLobby(s) {
  Object.assign(s, { phase: "lobby", board: null });
}

export default {
  max: 16,
  lateJoin: true, // เข้ากลางเกมได้ เป็น Operative ของทีมที่คนน้อยกว่า
  init: () => ({ phase: "lobby", board: null }),
  // คนใหม่ลงทีมที่คนน้อยกว่า (เท่ากันลง RED)
  player: (s) => ({ team: members(s, "blue").length < members(s, "red").length ? "blue" : "red", spy: false }),

  handle(s, id, msg) {
    const p = pl(s, id);
    if (s.phase === "lobby") {
      if (msg.t === "team" && TEAMS.includes(msg.team) && msg.team !== p.team) Object.assign(p, { team: msg.team, spy: false });
      // เป็น Spymaster แทนคนเดิมของทีม หรือกดซ้ำเพื่อเลิกเป็น
      if (msg.t === "spy") {
        const was = p.spy;
        for (const x of members(s, p.team)) x.spy = false;
        p.spy = !was;
      }
      if (msg.t === "start" && id === s.owner && TEAMS.every((t) => ready(s, t))) start(s);
      return;
    }
    const mine = p.team === s.turn;
    if (msg.t === "clue" && s.phase === "clue" && mine && p.spy) {
      const word = String(msg.word || "").trim().slice(0, 20);
      const n = msg.n === null ? null : Math.round(Number(msg.n));
      // Clue ต้องเป็นคำเดียว (ไม่มีเว้นวรรค) และไม่ใช่คำบนกระดานที่ยังไม่ถูกเปิด
      if (!word || /\s/.test(word) || s.board.some((c) => !c.r && clean(c.w) === clean(word))) return;
      if (n !== null && !(n >= 0 && n <= 9)) return;
      s.clue = { word, n };
      s.clues.push({ team: s.turn, word, n });
      // 0 หรือ ∞ เปิดได้ไม่จำกัด ไม่อย่างนั้นได้ตัวเลข +1 ใบ
      s.left = n ? n + 1 : null;
      s.guesses = 0;
      s.phase = "guess";
    }
    if (msg.t === "guess" && s.phase === "guess" && mine && !p.spy) {
      const i = Math.round(Number(msg.i));
      if (s.board[i] && !s.board[i].r) guess(s, i);
    }
    if (msg.t === "end" && s.phase === "guess" && mine && !p.spy && s.guesses > 0) endTurn(s);
    if (msg.t === "newgame" && s.phase === "over" && id === s.owner) toLobby(s);
  },

  // คนออกกลางเกม: ทีมเหลือไม่ถึง 2 คนกลับห้องรอ Spymaster ออกให้คนแรกของทีมเป็นแทน
  leave(s, id, gone) {
    if (s.phase === "lobby" || s.phase === "over") return;
    if (TEAMS.some((t) => members(s, t).length < 2)) return toLobby(s);
    if (gone.spy) members(s, gone.team)[0].spy = true;
  },

  view(s, id) {
    const me = pl(s, id);
    const v = {
      screen: s.phase, myTeam: me.team, iSpy: me.spy,
      players: s.players.map((p) => ({ name: p.name, team: p.team, spy: p.spy, me: p.id === id })),
    };
    if (s.phase === "lobby") return Object.assign(v, { ready: Object.fromEntries(TEAMS.map((t) => [t, ready(s, t)])) });
    const over = s.phase === "over";
    return Object.assign(v, {
      // การ์ด: w คำ, r สีที่เปิดแล้ว, k เฉลย (เห็นแค่ Spymaster และตอนจบเกม)
      board: s.board.map((c) => ({ w: c.w, r: c.r ? c.k : null, k: me.spy || over ? c.k : null })),
      first: s.first, turn: s.turn, clue: s.clue, left: s.left, guesses: s.guesses, clues: s.clues, last: s.last,
      agents: Object.fromEntries(TEAMS.map((t) => [t, agentsLeft(s, t)])),
      total: Object.fromEntries(TEAMS.map((t) => [t, t === s.first ? 9 : 8])),
      winner: s.winner, why: s.why,
    });
  },
};
