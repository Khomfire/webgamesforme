// ตัวคุมเกมฝั่ง server: ห้อง ผู้เล่น และส่งต่อคำสั่งให้กติกาของแต่ละเกม
// สถานะห้องเป็น JSON ล้วน (เก็บลงฐานข้อมูลได้) แต่ละเกมเป็นโมดูลที่มี init, player, handle, leave, view
import spy from "./spy.js";
import xo from "./xo.js";
import farkle from "./farkle.js";
import liar from "./liar.js";
import uno from "./uno.js";
import pokdeng from "./pokdeng.js";
import holdem from "./holdem.js";

export const GAMES = { spy, xo, farkle, liar, uno, pokdeng, holdem };

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
  g.handle(state, id, msg, now);
  return bump(state);
}

export function views(state, now = Date.now()) {
  const g = GAMES[state.game];
  return Object.entries(state.tokens).map(([token, id]) => ({
    token,
    view: { ...g.view(state, id, now), code: state.code, me: id, ids: state.players.map((p) => p.id), isHost: id === state.owner, seq: state.seq },
  }));
}

const cleanName = (n) => String(n || "").trim().slice(0, 20);

function addPlayer(state, token, name) {
  const id = "p" + state.nextId++;
  state.tokens[token] = id;
  state.players.push({ id, name, ...GAMES[state.game].player() });
  if (!state.owner) state.owner = id;
}

// คนออก: เอาออกจากห้อง ย้ายเจ้าของห้องให้คนถัดไป แล้วให้เกมจัดการต่อ
function remove(state, id) {
  const gone = state.players.find((p) => p.id === id);
  state.players = state.players.filter((p) => p.id !== id);
  for (const [t, x] of Object.entries(state.tokens)) if (x === id) delete state.tokens[t];
  if (!state.players.length) return { changed: true, empty: true };
  if (state.owner === id) state.owner = state.players[0].id;
  GAMES[state.game].leave(state, id, gone);
  return bump(state);
}

function bump(state) {
  state.seq++;
  return { changed: true };
}
