// Edge Function "game": หน้าเกมส่งคำสั่งมาที่นี่ ตัวคุมเกมอยู่ใน core.js
// เก็บสถานะห้องในตาราง rooms (ล็อกทีละห้องกันคำสั่งชนกัน) แล้วส่งสถานะของแต่ละคนผ่าน Realtime
// ไปที่ช่อง "p:<token>" ซึ่งรู้แค่เครื่องของคนนั้น
import postgres from "npm:postgres@3.4.5";
import { act, create, newCode, views } from "./core.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });
const URL = Deno.env.get("SUPABASE_URL")!;
const KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type View = { token: string; view: Record<string, unknown> };

async function broadcast(all: View[]) {
  const res = await fetch(`${URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: all.map(({ token, view }) => ({ topic: "p:" + token, event: "view", payload: view, private: false })) }),
  });
  if (!res.ok) console.error("broadcast failed", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // ออกจากหน้าเกมส่งมาด้วย sendBeacon เป็น text จึงอ่านเป็น text ก่อน
  let body;
  try { body = JSON.parse(await req.text()); } catch { return reply({ error: "bad request" }, 400); }
  const { game, code, token, msg } = body ?? {};
  if (typeof token !== "string" || token.length < 16 || typeof msg?.t !== "string") return reply({ error: "bad request" }, 400);

  try {
    if (msg.t === "create") {
      await sql`delete from rooms where updated_at < now() - interval '1 day'`; // ห้องเก่าที่ไม่มีใครเล่นแล้ว
      for (let i = 0; i < 20; i++) {
        const c = newCode();
        const made = create(game, c, token, msg.name);
        if (made.error) return reply(made);
        const rows = await sql`insert into rooms (code, game, state) values (${c}, ${game}, ${sql.json(made.state)}) on conflict do nothing returning code`;
        if (rows.length) return reply({ view: views(made.state).find((v: View) => v.token === token).view });
      }
      return reply({ error: "สร้างห้องไม่สำเร็จ" });
    }

    const out = await sql.begin(async (tx) => {
      const [row] = await tx`select state from rooms where code = ${String(code)} and game = ${String(game)} for update`;
      if (!row) return { error: `ไม่พบห้อง ${code}` };
      const state = row.state;
      const done = act(state, token, msg);
      if (done.error) return done;
      if (done.empty) {
        await tx`delete from rooms where code = ${code}`;
        return { left: true };
      }
      if (done.changed) await tx`update rooms set state = ${tx.json(state)}, updated_at = now() where code = ${code}`;
      return { state, changed: done.changed };
    });
    if (out.error || out.left) return reply(out);
    const all: View[] = views(out.state);
    if (out.changed) await broadcast(all);
    const mine = all.find((v) => v.token === token);
    return reply(mine ? { view: mine.view } : { left: true });
  } catch (e) {
    console.error(e);
    return reply({ error: "เชื่อมต่อไม่สำเร็จ" }, 500);
  }
});
