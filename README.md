# TB Coffee Loyalty App

Dashboard สำหรับระบบสะสมแต้มและบันทึกยอดขายรายวัน TB Coffee

**Live demo:** https://adisornbank.github.io/tb-coffee-loyalty-app-public/

## ฟีเจอร์

- แสดงรายชื่อลูกค้าและแต้มสะสม
- คำนวณแต้มอัตโนมัติจากยอดขายรายวัน
- วางข้อมูลยอดขายแล้วอัปเดต KPI ทันที

## สูตรคำนวณ

```
แต้มคงเหลือ = แต้มเดิม + แก้วที่ชำระเงินจริง − (แก้วฟรี × 10)
```

## รูปแบบข้อมูลรายวัน

```
19/06/2569
1. อเมริกาโน่ 40 บาท ป้าจอย
2. ลาเต้ 50 บาท ครูต๋อง
3. มอคค่า ฟรี ป้าจอย
```

## วิธีใช้งาน

### เปิดแบบไม่ต้องติดตั้ง

ดับเบิลคลิก `index.html` หรือเปิด `dist/index.html`

### พัฒนา / build

```bash
npm install
npm run dev      # dev server
npm run build    # สร้าง index.html แบบ standalone
npm start        # serve ที่พอร์ต 8080
```

## โครงสร้าง

- `src/parse.js` — อ่านข้อความยอดขายรายวัน
- `src/data.js` — ข้อมูลลูกค้า + สูตรคำนวณแต้ม
- `src/main.js` — UI และการเชื่อมข้อมูล
- `scripts/build.mjs` — bundle เป็นไฟล์ HTML เดียว
