// SPYFALL: 3 คนขึ้นไป ทุกคนได้สถานที่เดียวกัน ยกเว้นสายลับ หมดเวลาแล้วโหวตหาสายลับ
// สถานที่และบทบาท: ทุกคนได้สถานที่เดียวกัน คนละบทบาท สายลับไม่รู้สถานที่
const LOCATIONS = [
  { name: "โรงพยาบาล", roles: ["หมอ", "พยาบาล", "คนไข้", "ญาติคนไข้", "เภสัชกร", "รปภ.", "แม่บ้าน"] },
  { name: "โรงเรียน", roles: ["ครู", "นักเรียน", "ผู้อำนวยการ", "ภารโรง", "แม่ค้าโรงอาหาร", "ผู้ปกครอง", "หัวหน้าห้อง"] },
  { name: "ห้างสรรพสินค้า", roles: ["พนักงานขาย", "ลูกค้า", "รปภ.", "แคชเชียร์", "แม่บ้าน", "ผู้จัดการ", "เด็กหลงทาง"] },
  { name: "ตลาดนัด", roles: ["แม่ค้าส้มตำ", "ลูกค้า", "คนเก็บค่าที่", "นักดนตรีเปิดหมวก", "คนขายเสื้อผ้า", "วินมอเตอร์ไซค์", "นักท่องเที่ยว"] },
  { name: "สนามบิน", roles: ["นักบิน", "แอร์โฮสเตส", "ผู้โดยสาร", "เจ้าหน้าที่ ตม.", "คนขนกระเป๋า", "เจ้าหน้าที่เช็กอิน", "คนมารับ"] },
  { name: "ชายหาด", roles: ["ไลฟ์การ์ด", "นักท่องเที่ยว", "คนขายมะพร้าว", "คนนวด", "ชาวประมง", "คนเล่นเซิร์ฟ", "เด็กก่อปราสาททราย"] },
  { name: "โรงหนัง", roles: ["คนขายตั๋ว", "คนขายป๊อปคอร์น", "คนดู", "พนักงานฉายหนัง", "คู่เดต", "แม่บ้าน", "นักวิจารณ์หนัง"] },
  { name: "ร้านกาแฟ", roles: ["บาริสต้า", "ลูกค้า", "เจ้าของร้าน", "ฟรีแลนซ์นั่งทำงาน", "คนส่งของ", "นักศึกษาอ่านหนังสือ", "บล็อกเกอร์"] },
  { name: "สถานีตำรวจ", roles: ["ตำรวจ", "ผู้ต้องหา", "ผู้เสียหาย", "ทนาย", "นักข่าว", "สารวัตร", "พยาน"] },
  { name: "วัด", roles: ["พระ", "เณร", "คนมาทำบุญ", "แม่ชี", "นักท่องเที่ยว", "คนขายดอกไม้ธูปเทียน", "มัคนายก"] },
  { name: "สวนสัตว์", roles: ["ผู้ดูแลสัตว์", "สัตวแพทย์", "นักท่องเที่ยว", "ครูพาเด็กมาทัศนศึกษา", "คนขายไอติม", "ช่างภาพ", "ไกด์"] },
  { name: "ฟิตเนส", roles: ["เทรนเนอร์", "สมาชิกมือใหม่", "นักเพาะกาย", "พนักงานต้อนรับ", "ครูโยคะ", "แม่บ้าน", "คนมาลดน้ำหนัก"] },
  { name: "ร้านหมูกระทะ", roles: ["เจ้าของร้าน", "พนักงานเสิร์ฟ", "ลูกค้าวัยรุ่น", "คนเติมถ่าน", "นักร้องเวที", "แคชเชียร์", "คนล้างจาน"] },
  { name: "คอนเสิร์ต", roles: ["นักร้อง", "มือกลอง", "แฟนคลับ", "การ์ด", "ซาวด์เอนจิเนียร์", "ช่างภาพ", "คนขายของที่ระลึก"] },
  { name: "โรงแรม", roles: ["พนักงานต้อนรับ", "แขก", "แม่บ้าน", "เชฟ", "เบลบอย", "ผู้จัดการ", "คนขับรถรับส่ง"] },
  { name: "รถไฟ", roles: ["พนักงานขับรถไฟ", "พนักงานตรวจตั๋ว", "ผู้โดยสาร", "คนขายข้าวกล่อง", "นักท่องเที่ยวต่างชาติ", "ตำรวจรถไฟ", "นักเรียน"] },
  { name: "ธนาคาร", roles: ["พนักงานธนาคาร", "ลูกค้า", "รปภ.", "ผู้จัดการสาขา", "โจรปล้นธนาคาร", "พนักงานเติมเงินตู้", "ที่ปรึกษาการเงิน"] },
  { name: "ร้านตัดผม", roles: ["ช่างตัดผม", "ลูกค้า", "เด็กสระผม", "เจ้าของร้าน", "ลูกค้ารอคิว", "ช่างทำเล็บ", "เซลส์ขายน้ำยา"] },
  { name: "สนามฟุตบอล", roles: ["นักเตะ", "ผู้รักษาประตู", "กรรมการ", "โค้ช", "แฟนบอล", "นักพากย์", "คนขายน้ำ"] },
  { name: "เรือสำราญ", roles: ["กัปตัน", "ลูกเรือ", "นักท่องเที่ยว", "เชฟ", "นักร้องในเรือ", "หมอประจำเรือ", "คู่ฮันนีมูน"] },
];
const PLACES = LOCATIONS.map((l) => l.name);
const pl = (s, id) => s.players.find((p) => p.id === id);
// เปิดโหวตเมื่อหมดเวลา หรือเจ้าของห้องกดข้าม
const voting = (r, now) => r.voting || now >= r.endsAt;

function startRound(s, now) {
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const roles = [...location.roles].sort(() => Math.random() - 0.5);
  const ids = s.players.map((p) => p.id);
  s.round = {
    ids, location: location.name,
    roles: Object.fromEntries(ids.map((id, i) => [id, roles[i % roles.length]])),
    spy: ids[Math.floor(Math.random() * ids.length)],
    names: Object.fromEntries(ids.map((id) => [id, pl(s, id).name])),
    votes: {}, tally: {}, gains: {}, ready: [],
    endsAt: now + s.minutes * 60000, voting: false,
  };
  s.phase = "word";
}

// รอบต่อไปเริ่มเมื่อทุกคนที่อยู่ในห้องกดพร้อมครบ
function checkReady(s, now) {
  if (s.phase !== "score" || s.players.length < 3) return;
  if (s.players.every((p) => s.round.ready.includes(p.id))) startRound(s, now);
}

function addPoint(s, id) {
  const p = pl(s, id);
  if (!p) return;
  p.score++;
  s.round.gains[id] = (s.round.gains[id] || 0) + 1;
}

// นับโหวตเมื่อทุกคนที่ยังอยู่ในรอบโหวตครบ: ได้โหวตมากสุดคนเดียวและเป็นสายลับ = จับได้, เสมอ = สายลับรอด
function countVotes(s) {
  const r = s.round;
  if (s.phase !== "word") return;
  const voters = r.ids.filter((id) => pl(s, id));
  if (voters.some((id) => !(id in r.votes))) return;
  for (const v of voters) r.tally[r.votes[v]] = (r.tally[r.votes[v]] || 0) + 1;
  const max = Math.max(...Object.values(r.tally));
  const top = Object.entries(r.tally).filter(([, n]) => n === max);
  r.caught = top.length === 1 && top[0][0] === r.spy;
  if (r.caught) voters.filter((id) => id !== r.spy).forEach((id) => addPoint(s, id));
  else addPoint(s, r.spy);
  if (pl(s, r.spy)) s.phase = "guess";
  else finishGuess(s, null);
}

function finishGuess(s, text) {
  const r = s.round;
  r.guess = text;
  r.correct = text === r.location;
  if (r.correct) addPoint(s, r.spy);
  const top = Math.max(...s.players.map((p) => p.score));
  s.phase = top >= s.target ? "over" : "score";
}

export default {
  lateJoin: true, // เข้ากลางเกมได้ รอเล่นรอบถัดไป
  init: () => ({ target: 5, minutes: 5, phase: "lobby", round: null }),
  player: () => ({ score: 0 }),

  handle(s, id, msg, now) {
    const r = s.round;
    if (msg.t === "vote" && s.phase === "word" && voting(r, now) && r.ids.includes(id) && r.ids.includes(msg.target) && msg.target !== id) {
      r.votes[id] = msg.target;
      countVotes(s);
    }
    if (msg.t === "guess" && s.phase === "guess" && id === r.spy) finishGuess(s, String(msg.text));
    if (msg.t === "ready" && s.phase === "score") {
      if (!r.ready.includes(id)) r.ready.push(id);
      checkReady(s, now);
    }
    if (id === s.owner) {
      if (msg.t === "target") s.target = Math.min(20, Math.max(1, Math.round(Number(msg.value)) || 5));
      if (msg.t === "minutes") s.minutes = Math.min(15, Math.max(1, Math.round(Number(msg.value)) || 5));
      if (msg.t === "start" && s.phase === "lobby" && s.players.length >= 3) startRound(s, now);
      if (msg.t === "skip" && s.phase === "word") r.voting = true;
      if (msg.t === "newgame") {
        for (const p of s.players) p.score = 0;
        s.phase = "lobby";
        s.round = null;
      }
    }
  },

  leave(s, id) {
    if (s.phase === "guess" && s.round.spy === id) finishGuess(s, null);
    else countVotes(s);
    checkReady(s, Date.now());
  },

  view(s, id, now) {
    const r = s.round;
    const phase = s.phase;
    const v = {
      screen: phase, target: s.target, minutes: s.minutes, places: PLACES,
      inRound: !!r && r.ids.includes(id),
      players: s.players.map((p) => ({ name: p.name, score: p.score, gain: (r && r.gains[p.id]) || 0 })),
    };
    if (phase === "word" && v.inRound) {
      const voters = r.ids.filter((x) => pl(s, x));
      v.isSpy = id === r.spy;
      if (!v.isSpy) { v.location = r.location; v.role = r.roles[id]; }
      v.candidates = voters.filter((x) => x !== id).map((x) => ({ id: x, name: r.names[x] }));
      v.myVote = id in r.votes ? r.names[r.votes[id]] : null;
      v.voted = voters.filter((x) => x in r.votes).length;
      v.voters = voters.length;
      v.voting = voting(r, now);
      v.endsIn = r.endsAt - now;
    }
    if (phase === "guess" || phase === "score" || phase === "over") {
      v.spyName = r.names[r.spy];
      v.isSpy = id === r.spy;
      v.caught = r.caught;
      v.tally = Object.entries(r.tally).map(([t, n]) => ({ name: r.names[t], n })).sort((a, b) => b.n - a.n);
    }
    // เฉลยสถานที่หลังสายลับทายเสร็จแล้วเท่านั้น
    if (phase === "score" || phase === "over") {
      v.location = r.location;
      v.guess = r.guess;
      v.correct = r.correct;
      v.ready = r.ready.includes(id);
      v.readyCount = s.players.filter((p) => r.ready.includes(p.id)).length;
    }
    if (phase === "over") {
      const top = Math.max(...v.players.map((p) => p.score));
      v.winners = v.players.filter((p) => p.score === top).map((p) => p.name);
    }
    return v;
  },
};
