# webgamesforme

Hub รวมเกมเว็บไว้เล่นกับเพื่อน เปิด `index.html` ได้เลย ไม่ต้อง build

## เพิ่มเกมใหม่

1. สร้างโฟลเดอร์ `games/<id>/` และใส่ `index.html` ของเกมไว้ข้างใน ใส่ `<link rel="icon" href="../../logo.svg">` ใน `<head>` ให้แท็บมีโลโก้เว็บ
2. เพิ่มหนึ่งบรรทัดในอาร์เรย์ `games` ใน `index.html`:

   ```js
   { id: "<id>", name: "GAME NAME", desc: "คำอธิบายสั้นๆ", players: "จำนวนผู้เล่น" },
   ```
   แล้ววาดภาพประจำเกมเป็น SVG (48x48 ใช้ `currentColor` เป็นสีกล่อง ห้ามใช้อีโมจิ) ใส่ใน `ICONS` ของไฟล์เดียวกัน
3. ใส่ `<script src="../../sfx.js"></script>` ในหน้าเกมเพื่อให้มีเสียงตอนกดปุ่ม และอ่านชื่อผู้เล่นที่ใส่ไว้ใน hub ได้จาก `localStorage.getItem("wgfm-name")`
   เลือกเสียงของแต่ละปุ่มได้ด้วย `data-sfx="create|join|start|next|vote|confirm|roll|none"` หรือเรียก `playSfx("win")` ตอนมีคนชนะ `playSfx("place")` ตอนหมากลงกระดาน และ `playBoom()` สำหรับเสียงระเบิด ปุ่มที่ไม่ระบุจะเป็นเสียงกดปกติ
   ขนาดใน CSS ใช้ `rem` (ไม่ใช้ `px`) แล้วตั้ง `font-size` ของ `:root` ตามความสูงหน้าเล่นแบบเกมอื่น ทั้งหน้าจะย่อขยายให้พอดีจอมือถือ iPad และคอม
4. ทุกเกมต้องมี popup ผู้ชนะและพลุตอนจบเกม: ใส่ `<script src="../../fireworks.js"></script>` หลัง `sfx.js` แล้วเรียก `fireworks()` ตอนเปิด `<dialog>` ผู้ชนะ ที่มี `<canvas id="fireworks">` อยู่ข้างใน
5. เกมออนไลน์: กติกาและสถานะเกมอยู่ที่ server (Supabase Edge Function `game`) หน้าเกมแค่ส่งคำสั่งและวาดสถานะที่ได้มา
   - เขียนกติกาเป็น `supabase/functions/game/<id>.js` ที่ export `init`, `player`, `handle`, `leave`, `view` (ดูเกมที่มีอยู่เป็นตัวอย่าง) แล้วเพิ่มใน `GAMES` ของ `core.js`
   - หน้าเกมใส่ supabase-js กับ `<script src="../../net.js"></script>` แล้วใช้ `openRoom("<id>", onView, onError)` สร้างหรือเข้าห้อง และ `send(msg)` ส่งคำสั่ง
   - ข้อมูลที่ส่งถี่ๆ ระหว่างเครื่อง (เช่นเส้นที่วาดใน DRAW & GUESS) ไม่ต้องผ่าน server: ส่งด้วย `ink(data)` ของห้อง แล้วรับด้วย `onInk` ตัวที่ 5 ของ `openRoom`
   - deploy ฟังก์ชันใหม่ทุกครั้งที่แก้ไฟล์ใน `supabase/functions/game/` ตาราง `rooms` อยู่ใน `supabase/migrations/`
   - ปุ่มหยุดเกม: ใส่ `<script src="../../pause.js"></script>` หลัง `fireworks.js` แล้วเรียก `pauseUi(view, send)` ทุกครั้งที่วาดใหม่ ถ้าเกมมีเวลาต่อตา เก็บเวลาหมดไว้ที่ `turnEnds` ของสถานะ ตอนเล่นต่อจะเลื่อนให้เอง และระหว่างหยุด (`view.paused`) ให้หลอดเวลาค้างไว้ ไม่ส่ง `timeout`
   - ปุ่มยอมแพ้: ใส่ `<script src="../../resign.js"></script>` หลัง `pause.js` แล้วเรียก `resignUi(view, send)` ทุกครั้งที่วาดใหม่ ฝั่ง server ใส่ `canResign(state, id)` ในโมดูลเกม (ปุ่มขึ้นเมื่อคืน true) แล้วจัดการคำสั่ง `resign` ใน `handle`
   - ตั้งค่าในห้องรอ: ใส่ `<script src="../../setup.js"></script>` หลัง `pause.js` แล้วใส่ `setupHtml(items, isHost)` ในหน้าห้องรอ และเรียก `setupBind(app, items, send)` หลังวาด (รูปแบบของ `items` อยู่หัวไฟล์ `setup.js`)

## รันในเครื่อง

```sh
python3 -m http.server 8000
```

แล้วเปิด http://localhost:8000
