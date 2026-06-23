export const META = {
  updateDate: '19/06/2569',
  updateTime: '',
};

const RAW = `หมู	30
เจ้ต่าย	30
เจ้เต๋า	26
ป้าจอย	25
หมวย	23
สท.ต่าย	23
เท่ห์	22
ประภา	21
ป้าหนู	21
พี่แดง	19
แตงโม	19
ครูยุ้ย	19
ครูต๋อง	19
ศรีแพร	19
พี่แขก	19
พลอย	17
กุ๊ก	17
ป.ปุ๋ย	17
อ๊อฟ	17
ศูนย์เด็กเล็ก	16
พี่บอล	16
ปอย	16
ครูเคน	15
อาทุย	15
แพร	15
คุณหอม	15
อาไฝ	13
น้ำ	13
ยุ้ย	13
ดำ	13
ป้าเฟิร์น	12
ลุงวิญญู	12
สวน	12
ไอซ์	12
เฮียหมุ่ย	12
โจ๊ก พังราด	12
กุ้ง	12
พี่กานดา flash	11
ลุงคต	10
พี่เงาะ	10
จ๊ะจ๋า	10
มดแดง	10
ลุงหนึ่ง	10
เจ้ปุ๊	9
แคท	9
แนน es	9
อั้ม อนามัย	9
เฟิน (ป้าหน่อย)	9
วีระ	9
พี่บอย	8
ช่างเอ	8
อัง	8
หนุ่ม อนามัย	8
ต้า	8
ครีมอนามัยกระแจะ	8
อลิซ	8
ทราย	8
พี่แนน	8
ปากหมู	8
กิ	8
เจ้สัจจะ	8
ครูบลู	8
อาไล	7
โรงหมู	7
โบว์ อนามัย	7
ป้าหนู (ลุงจ๋า)	7
ออม ร้านปลาย	7
เจ้วาสนา	7
ทรายหมาพี	7
พังราด	6
เจ้แอน	6
เจ้ปูนิ่ม	6
เจ้จุ่มจิ้ม	6
ลุงแปร์	6
ลองกอง	6
อัง อนามัย	6
เจ้แดง	6
ลุงเทพ	6
นุ้ย เทศบาล	6
เจ้น้อง	6
ครูหนองไทร	6
อาก้อย	5
ปิ๊ก	5
พี่อ้อย	5
กิ๊บ	5
เจ้กิ่ง	5
เด็กๆ	4
อนามัย	4
นิชา	4
พี่เมืองไทย	4
ปลั๊ก	4
รพ.	4
มิกซ์	4
ฝน	4
แอน	4
ลาบ	4
ปีโป้	3
คิว	3
เจ้เก๋ มี.5	3
เฮียแจ๊ค จุรีย์	3
กี้	3
มะเหมี่ยว	3
ป้ากุหลาบ	3
มด	3
มัด	3
นิ่ม	3
พี่พู่	2
กะเต๋า	2
ดาม	2
อาร์ท	2
หนองไทร	2
เจ้บิ๋ม	2
ป้าหน่อย	2
ครูไบร์ท	2
โบ๊ท	2
มิ้ว	2
ทรายกิ	2
เจ้นก	1
นุ่น	1
เจ้หนึ่ง	1
เฮียเอก	1
ครูก้อย	1
อาส่ง	1
เฮียแจ็ค	0
พี่รุจ	0`;

function buildCustomers() {
  const rows = RAW.trim().split('\n').map((line) => {
    const [name, cups] = line.split('\t');
    return { name, cups: Number(cups) };
  });

  return rows.map((row, i) => ({
    name: row.name,
    rank: i + 1,
    cups: row.cups,
    star: i === 0,
    pointsOriginal: row.cups,
    paidCups: 0,
    freeCupsUsed: 0,
    totalOrdered: 0,
    confirmed: false,
    transactions: [],
  }));
}

export const customers = buildCustomers();

export const STATS = {
  totalCustomers: customers.length,
  totalPoints: customers.reduce((s, c) => s + c.cups, 0),
};

export const KPI = {
  sales: 0,
  cups: 0,
  customers: 0,
};

export function calcPoints(data) {
  const pointsAdded = data.paidCups;
  const pointsUsed = data.freeCupsUsed * 10;
  const pointsRemaining = data.pointsOriginal + pointsAdded - pointsUsed;
  const progress = ((pointsRemaining % 10) + 10) % 10;
  const reward = Math.floor(Math.max(pointsRemaining, 0) / 10);
  return { pointsAdded, pointsUsed, pointsRemaining, progress, reward };
}

export function findCustomer(name, list = customers) {
  const target = name.trim();
  if (!target) return null;

  let found = list.find((c) => c.name === target);
  if (found) return found;

  const lower = target.toLocaleLowerCase('th');
  found = list.find((c) => c.name.toLocaleLowerCase('th') === lower);
  if (found) return found;

  found = list.find((c) => c.name.includes(target) || target.includes(c.name));
  return found ?? null;
}

function formatTxTime(orderNumber) {
  const hour = 8 + Math.floor(orderNumber / 6);
  const minute = (orderNumber * 7) % 60;
  return `${String(Math.min(hour, 20)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function resetDailySales() {
  for (const customer of customers) {
    customer.paidCups = 0;
    customer.freeCupsUsed = 0;
    customer.totalOrdered = 0;
    customer.transactions = [];
    customer.confirmed = false;
    customer.unknownName = false;
  }
}

export function applyDailySales(dayItems) {
  const warnings = [];
  const appliedCustomers = new Set();

  resetDailySales();

  for (const item of dayItems) {
    const customer = findCustomer(item.customerName);
    if (!customer) {
      warnings.push(`ไม่พบลูกค้า "${item.customerName}" (${item.sourceLine})`);
      continue;
    }

    customer.totalOrdered += 1;
    if (item.isFree) {
      customer.freeCupsUsed += 1;
    } else {
      customer.paidCups += 1;
    }

    customer.transactions.push({
      time: formatTxTime(item.orderNumber ?? customer.transactions.length + 1),
      name: item.productName,
      price: item.isFree ? 'ฟรี' : item.price,
      change: item.isFree ? '−10 แต้ว' : '+1 แต้ว',
      type: item.isFree ? 'free' : 'paid',
    });

    customer.transactions.sort((a, b) => a.time.localeCompare(b.time));
    customer.confirmed = true;
    appliedCustomers.add(customer.name);

    const calc = calcPoints(customer);
    customer.cups = calc.pointsRemaining;
  }

  sortCustomersByPoints();
  recalcStats();

  return {
    warnings,
    appliedCount: dayItems.length - warnings.length,
    customerCount: appliedCustomers.size,
  };
}

export function sortCustomersByPoints() {
  customers.sort((a, b) => b.cups - a.cups || a.name.localeCompare(b.name, 'th'));
  customers.forEach((customer, index) => {
    customer.rank = index + 1;
    customer.star = index === 0;
  });
}

export function recalcStats() {
  STATS.totalCustomers = customers.length;
  STATS.totalPoints = customers.reduce((sum, customer) => sum + customer.cups, 0);
}

export function updateKpi(summary) {
  KPI.sales = summary.totalRevenue;
  KPI.cups = summary.totalItems;
  KPI.customers = summary.uniqueCustomers;
}
