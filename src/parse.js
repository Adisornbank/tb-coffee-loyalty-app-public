const CUSTOMER_ALIASES = {
  รุจ: 'พี่รุจ',
  'ทราย หมาพี': 'ทรายหมาพี',
};

export function cleanText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeCustomerName(value) {
  const cleaned = cleanText(value);
  return CUSTOMER_ALIASES[cleaned] ?? cleaned;
}

function parseOrderDetails(details) {
  const text = cleanText(details);

  const freeExplicit = text.match(/^(.+?)\s+ฟรี\s+(.+)$/iu);
  if (freeExplicit) {
    return {
      productName: cleanText(freeExplicit[1]),
      price: 0,
      customerName: normalizeCustomerName(freeExplicit[2]),
      isFree: true,
    };
  }

  const priced = text.match(/^(.+?)\s+(\d{1,3})\s*(?:บาท)?\s*(.+)$/iu);
  if (!priced) return null;

  const price = Number(priced[2]);
  let customerPart = cleanText(priced[3]).replace(/^บาท\s*/iu, '');

  if (/^ฟรี\s+/iu.test(customerPart)) {
    customerPart = customerPart.replace(/^ฟรี\s+/iu, '');
    return {
      productName: cleanText(priced[1]),
      price: 0,
      customerName: normalizeCustomerName(customerPart),
      isFree: true,
    };
  }

  return {
    productName: cleanText(priced[1]),
    price,
    customerName: normalizeCustomerName(customerPart),
    isFree: price === 0,
  };
}

function parseOrderLine(line) {
  const orderMatch = line.match(/^(\d+)\s*[.)]\s*(.+)$/u);
  if (!orderMatch) return null;

  const parsed = parseOrderDetails(orderMatch[2]);
  if (!parsed?.customerName || !parsed.productName) return null;

  return {
    orderNumber: Number(orderMatch[1]),
    ...parsed,
    sourceLine: line,
  };
}

export function parseSalesText(input, fallbackDate = '') {
  const lines = input.split(/\r?\n/).map((line) => cleanText(line)).filter(Boolean);
  const days = [];
  const looseLines = [];

  let currentDay = null;
  let parsingOtherItems = false;

  for (const line of lines) {
    if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}$/u.test(line)) {
      currentDay = {
        date: line.replace(/\s+/g, ''),
        items: [],
        unparsedLines: [],
      };
      days.push(currentDay);
      parsingOtherItems = false;
      continue;
    }

    if (/^อื่น\s*ๆ$/iu.test(line.replace(/\s+/g, ''))) {
      parsingOtherItems = true;
      continue;
    }

    if (parsingOtherItems) {
      if (currentDay) currentDay.unparsedLines.push(line);
      else looseLines.push(line);
      continue;
    }

    const parsed = parseOrderLine(line);
    if (!parsed) {
      if (currentDay) currentDay.unparsedLines.push(line);
      else looseLines.push(line);
      continue;
    }

    if (!currentDay) {
      currentDay = {
        date: fallbackDate,
        items: [],
        unparsedLines: [],
      };
      days.push(currentDay);
    }

    currentDay.items.push({
      orderNumber: parsed.orderNumber,
      productName: parsed.productName,
      price: parsed.price,
      customerName: parsed.customerName,
      isFree: parsed.isFree,
      sourceLine: parsed.sourceLine,
    });
  }

  return { days, looseLines };
}

export function summarizeDay(day) {
  const customerMap = new Map();
  let totalRevenue = 0;
  let paidCups = 0;
  let freeCups = 0;

  for (const item of day?.items ?? []) {
    const paidAmount = item.isFree ? 0 : item.price;
    totalRevenue += paidAmount;

    if (item.isFree) freeCups += 1;
    else paidCups += 1;

    const existing = customerMap.get(item.customerName);
    if (existing) {
      existing.paidCups += item.isFree ? 0 : 1;
      existing.freeCups += item.isFree ? 1 : 0;
      existing.totalSpent += paidAmount;
      existing.items.push(item);
    } else {
      customerMap.set(item.customerName, {
        customerName: item.customerName,
        paidCups: item.isFree ? 0 : 1,
        freeCups: item.isFree ? 1 : 0,
        totalSpent: paidAmount,
        items: [item],
      });
    }
  }

  return {
    totalRevenue,
    paidCups,
    freeCups,
    totalItems: paidCups + freeCups,
    uniqueCustomers: customerMap.size,
    customers: Array.from(customerMap.values()),
  };
}