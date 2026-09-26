# webgamesforme

Hub รวมเกมเว็บไว้เล่นกับเพื่อน เปิด `index.html` ได้เลย ไม่ต้อง build

## เพิ่มเกมใหม่

1. สร้างโฟลเดอร์ `games/<id>/` และใส่ `index.html` ของเกมไว้ข้างใน
2. เพิ่มหนึ่งบรรทัดในอาร์เรย์ `games` ใน `index.html`:

   ```js
   { id: "<id>", name: "ชื่อเกม", desc: "คำอธิบายสั้นๆ", players: "จำนวนผู้เล่น" },
   ```
3. ใส่ `<script src="../../sfx.js"></script>` ในหน้าเกมเพื่อให้มีเสียงตอนกดปุ่ม และอ่านชื่อผู้เล่นที่ใส่ไว้ใน hub ได้จาก `localStorage.getItem("wgfm-name")`
   เลือกเสียงของแต่ละปุ่มได้ด้วย `data-sfx="create|join|start|next|vote|confirm|roll"` หรือเรียก `playSfx("win")` ตอนมีคนชนะ และ `playBoom()` สำหรับเสียงระเบิด ปุ่มที่ไม่ระบุจะเป็นเสียงกดปกติ
4. ทุกเกมต้องมี popup ผู้ชนะและพลุตอนจบเกม: ใส่ `<script src="../../fireworks.js"></script>` หลัง `sfx.js` แล้วเรียก `fireworks()` ตอนเปิด `<dialog>` ผู้ชนะ ที่มี `<canvas id="fireworks">` อยู่ข้างใน

## รันในเครื่อง

```sh
python3 -m http.server 8000
```

แล้วเปิด http://localhost:8000
