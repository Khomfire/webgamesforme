# webgamesforme

Hub รวมเกมเว็บไว้เล่นกับเพื่อน เปิด `index.html` ได้เลย ไม่ต้อง build

## เพิ่มเกมใหม่

1. สร้างโฟลเดอร์ `games/<id>/` และใส่ `index.html` ของเกมไว้ข้างใน
2. เพิ่มหนึ่งบรรทัดในอาร์เรย์ `games` ใน `index.html`:

   ```js
   { id: "<id>", name: "ชื่อเกม", desc: "คำอธิบายสั้นๆ" },
   ```

## รันในเครื่อง

```sh
python3 -m http.server 8000
```

แล้วเปิด http://localhost:8000
