// ตัวคุมเกมฝั่ง server: ห้อง ผู้เล่น และส่งต่อคำสั่งให้กติกาของแต่ละเกม
// สถานะห้องเป็น JSON ล้วน (เก็บลงฐานข้อมูลได้) แต่ละเกมเป็นโมดูลที่มี init, player, handle, leave, view
// player(state) สร้างข้อมูลของผู้เล่นใหม่ ได้สถานะห้องไว้ดูคนที่อยู่ก่อน (เช่นเลือกสีที่ยังไม่มีใครใช้)
import spy from "./spy.js";
import xo from "./xo.js";
import farkle from "./farkle.js";
import liar from "./liar.js";
import uno from "./uno.js";
import blackjack from "./blackjack.js";
import holdem from "./holdem.js";
import president from "./president.js";
import connect4 from "./connect4.js";
import draw from "./draw.js";
import dots from "./dots.js";
import chess from "./chess.js";
import go from "./go.js";
import ludo from "./ludo.js";

export const GAMES = { spy, xo, farkle, liar, uno, blackjack, holdem, president, connect4, draw, dots, chess, go, ludo };

export const newCode = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");

// ผู้เล่นแต่ละคนมี token ลับ (รู้แค่เครื่องตัวเอง ใช้เป็นชื่อช่องรับสถานะ) และ id สาธารณะที่คนอื่นเห็นได้
export function create(game, code, token, name) {
  const g = GAMES[game];
  name = cleanName(name);
  if (!g || !name) return { error: "สร้างห้องไม่สำเร็จ" };
  const state = { code, game, seq: 0, nextId: 1, owner: null, players: [], tokens: {}, ...g.init() };
  addPlayer(state, token, name);
  return { state };
}

// ทำตามคำสั่งของเจ้าของ token แก้ state ในที่ แล้วบอกว่าต้องส่งสถานะใหม่ให้ทุกคนไหม
export function act(state, token, msg, now = Date.now()) {
  const g = GAMES[state.game];
  if (msg.t === "join") {
    if (state.tokens[token]) return { changed: false };
    const name = cleanName(msg.name);
    if (g.max && state.players.length >= g.max) return { error: "ห้องเต็ม" };
    if (!g.lateJoin && state.phase !== "lobby") return { error: "เกมเริ่มแล้ว" };
    if (!name || state.players.some((p) => p.name === name)) return { error: `ชื่อ "${name}" ซ้ำ` };
    addPlayer(state, token, name);
    return bump(state);
  }
  const id = state.tokens[token];
  if (!id) return { error: "ไม่ได้อยู่ในห้องแล้ว" };
  if (msg.t === "sync") return { changed: false };
  if (msg.t === "leave") return remove(state, id);
  // คนอื่นในห้องแจ้งว่าคนนี้หลุดไปนานแล้ว
  if (msg.t === "gone") return msg.id !== id && state.players.some((p) => p.id === msg.id) ? remove(state, msg.id) : { changed: false };
  // หยุดเกม (ใครก็กดหยุดหรือเล่นต่อได้) ระหว่างหยุดเกมไม่รับคำสั่งอื่น เวลาของตาหยุดนับ
  if (msg.t === "pause") {
    if (state.paused || state.phase === "lobby" || state.phase === "over") return { changed: false };
    state.paused = { by: state.players.find((p) => p.id === id).name, at: now };
    return bump(state);
  }
  if (msg.t === "resume") {
    if (!state.paused) return { changed: false };
    resume(state, now);
    return bump(state);
  }
  if (state.paused) return { changed: false };
  g.handle(state, id, msg, now);
  return bump(state);
}

// เล่นต่อ: เลื่อนเวลาที่นับอยู่ (หมดเวลาตา, หมดเวลารอบของ SPYFALL) ออกไปเท่ากับที่หยุดไว้
function resume(state, now) {
  const d = now - state.paused.at;
  if (typeof state.turnEnds === "number") state.turnEnds += d;
  if (state.round && typeof state.round.endsAt === "number") state.round.endsAt += d;
  state.paused = null;
}

export function views(state, now = Date.now()) {
  const g = GAMES[state.game];
  if (state.paused) now = state.paused.at; // หยุดเกมอยู่ เวลาที่เหลือค้างไว้ที่ตอนกดหยุด
  return Object.entries(state.tokens).map(([token, id]) => ({
    token,
    view: { ...g.view(state, id, now), code: state.code, me: id, ids: state.players.map((p) => p.id), isHost: id === state.owner, seq: state.seq, paused: state.paused ? state.paused.by : null },
  }));
}

const cleanName = (n) => String(n || "").trim().slice(0, 20);

function addPlayer(state, token, name) {
  const id = "p" + state.nextId++;
  state.tokens[token] = id;
  state.players.push({ id, name, ...GAMES[state.game].player(state) });
  if (!state.owner) state.owner = id;
}

// คนออก: เอาออกจากห้อง ย้ายเจ้าของห้องให้คนถัดไป แล้วให้เกมจัดการต่อ
function remove(state, id) {
  const gone = state.players.find((p) => p.id === id);
  state.players = state.players.filter((p) => p.id !== id);
  for (const [t, x] of Object.entries(state.tokens)) if (x === id) delete state.tokens[t];
  if (!state.players.length) return { changed: true, empty: true };
  if (state.owner === id) state.owner = state.players[0].id;
  const ends = [state.turnEnds, state.round && state.round.endsAt];
  GAMES[state.game].leave(state, id, gone);
  if (state.paused) {
    // เวลาที่เพิ่งเริ่มนับใหม่ระหว่างหยุด (ตาเปลี่ยนเพราะคนออก) ให้นับจากตอนกดหยุด เล่นต่อแล้วจะได้เต็มเวลา
    const early = Date.now() - state.paused.at;
    if (state.turnEnds !== ends[0]) state.turnEnds -= early;
    if (state.round && state.round.endsAt !== ends[1]) state.round.endsAt -= early;
    if (state.phase === "lobby" || state.phase === "over") state.paused = null; // คนออกจนเกมจบหรือกลับไปรอ
  }
  return bump(state);
}

function bump(state) {
  state.seq++;
  return { changed: true };
}
