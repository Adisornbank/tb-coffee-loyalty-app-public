import './style.css';
import {
  KPI,
  customers,
  calcPoints,
  META,
  STATS,
  applyDailySales,
  updateKpi,
  findCustomer,
} from './data.js';
import { parseSalesText, summarizeDay } from './parse.js';

const state = {
  tab: 'customers',
  selected: 'ครูต๋อง',
  query: '',
  pasteOpen: false,
  showAll: false,
  pasteMessage: '',
  pasteError: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function icon(name, size = 18) {
  const icons = {
    search: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
    filter: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 5h16l-6.2 7.4V19l-3.6 2v-6.6L4 5z"/></svg>`,
    calc: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/></svg>`,
    gift: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-2-5-2-5 0s3 2 5 0 5-2 5 0-3 2-5 0"/></svg>`,
    paste: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>`,
    cup: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 8h12v2a6 6 0 01-6 6 6 6 0 01-6-6V8zm14 2h2v1a4 4 0 01-4 4h-1.1A8 8 0 0022 10z"/></svg>`,
  };
  return icons[name] || '';
}

const chartSales = `<svg class="chart" viewBox="0 0 120 32" preserveAspectRatio="none">
  <defs><linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22c55e" stop-opacity=".45"/><stop offset="100%" stop-color="#22c55e" stop-opacity="0"/></linearGradient></defs>
  <polygon points="0,24 20,20 40,22 60,14 80,16 100,10 120,6 120,32 0,32" fill="url(#gG)"/>
  <polyline points="0,24 20,20 40,22 60,14 80,16 100,10 120,6" fill="none" stroke="#22c55e" stroke-width="2.5"/>
</svg>`;

const chartCups = `<svg class="chart" viewBox="0 0 120 32">
  <rect x="6" y="14" width="12" height="18" rx="3" fill="#3b82f6" opacity=".45"/>
  <rect x="26" y="6" width="12" height="26" rx="3" fill="#60a5fa"/>
  <rect x="46" y="12" width="12" height="20" rx="3" fill="#3b82f6" opacity=".65"/>
  <rect x="66" y="2" width="12" height="30" rx="3" fill="#2563eb"/>
  <rect x="86" y="10" width="12" height="22" rx="3" fill="#3b82f6" opacity=".75"/>
</svg>`;

const chartCustomers = `<svg class="chart" viewBox="0 0 120 32" preserveAspectRatio="none">
  <polyline points="0,18 30,10 60,20 90,8 120,14" fill="none" stroke="#c084fc" stroke-width="2.5"/>
  <circle cx="30" cy="10" r="3" fill="#a855f7"/><circle cx="90" cy="8" r="3" fill="#a855f7"/>
</svg>`;

function renderCups(progress) {
  return Array.from({ length: 10 }, (_, i) =>
    `<span class="cup-dot ${i < progress ? 'on' : ''}">${icon('cup')}</span>`
  ).join('');
}

function renderTransactions(txs) {
  if (!txs.length) return '<p class="empty-tx">ไม่มีรายการวันนี้</p>';
  return txs.map((tx) => {
    const cls = tx.type === 'free' ? 'free' : 'paid';
    return `<div class="tx-row ${cls}">
      <span class="tx-time">${tx.time}</span>
      <span class="tx-name">${tx.name}</span>
      <span class="tx-price">${tx.price}</span>
      <span class="tx-pts">${tx.change}</span>
    </div>`;
  }).join('');
}

function renderFormula() {
  const data = customers.find((c) => c.name === state.selected) || customers.find((c) => c.name === 'ครูต๋อง');
  if (!data) return '';
  const c = calcPoints(data);
  const deduct = data.freeCupsUsed * 10;
  return `
    <section class="card formula-card" id="formulaBlock">
      <div class="formula-head">
        <span class="formula-ico">${icon('calc')}</span>
        สูตรการคำนวณแต้ม
      </div>
      <div class="formula-eq big">
        <em class="c-green">${data.pointsOriginal}</em><i>+</i>
        <em class="c-orange">${c.pointsAdded}</em><i>−</i>
        <em class="c-red">${deduct}</em><i>=</i>
        <em class="c-blue">${c.pointsRemaining} แต้ม</em>
      </div>
      <p class="formula-rule">แต้มคงเหลือ = แต้มเดิม + แก้วที่ชำระเงินจริง − (แก้วฟรี × 10)</p>
      <div class="formula-grid">
        <div><small>แต้มเดิม</small><strong class="c-green">${data.pointsOriginal}</strong></div>
        <div><small>แต้มเพิ่ม</small><strong class="c-orange">+${c.pointsAdded}</strong></div>
        <div><small>แต้มที่ใช้</small><strong class="c-red">−${c.pointsUsed}</strong></div>
        <div><small>แต้มคงเหลือ</small><strong class="c-blue">${c.pointsRemaining}</strong></div>
      </div>
    </section>`;
}

function visibleCustomers() {
  const q = state.query.trim().toLowerCase();
  const filtered = customers.filter((c) => !q || c.name.toLowerCase().includes(q));
  if (q || state.showAll) return filtered;
  return filtered.slice(0, 10);
}

function customerListHTML() {
  return visibleCustomers()
    .map((c) => `
      <button type="button" class="customer-item ${c.name === state.selected ? 'active' : ''}" data-name="${c.name}">
        <span class="rank">${c.rank}</span>
        ${c.name === state.selected ? '<span class="star">★</span>' : '<span class="star ghost"></span>'}
        <span class="name">${c.name}</span>
        <span class="pts">${calcPoints(c).pointsRemaining} แต้ม</span>
      </button>`)
    .join('');
}

function detailHTML() {
  const data = customers.find((c) => c.name === state.selected);
  if (!data) return '';
  const c = calcPoints(data);
  const progress = c.progress;
  const reward = c.reward;
  const displayCups = c.pointsRemaining;

  return `
    <section class="detail card border-blue">
      <div class="detail-top">
        <h2>${data.name} <span class="star">★</span></h2>
        <p class="detail-pts">${displayCups} <span>แต้ม</span></p>
      </div>
      <div class="reward card-inner">
        <div class="reward-ico">${icon('gift')}</div>
        <div>
          <strong>แลกฟรีได้ ${reward} แก้ว</strong>
          <span>(10 แต้ม = 1 แก้วฟรี)</span>
        </div>
      </div>
      <div class="progress-wrap">
        <label>ความคืบหน้า 10 แต้ม</label>
        <div class="cups">${renderCups(progress)}</div>
        <p class="prog-count">${progress} / 10 แต้ม</p>
      </div>
      <div class="tx-block">
        <h3>รายการวันนี้ (${META.updateDate})</h3>
        ${renderTransactions(data.transactions)}
        <button type="button" class="link-btn">ดูประวัติทั้งหมด →</button>
      </div>
    </section>`;
}

function salesTabHTML() {
  const data = customers.find((c) => c.name === state.selected);
  const txs = data?.transactions?.filter((t) => t.type === 'paid') || [];
  const total = txs.reduce((s, t) => s + t.price, 0);
  return `
    <section class="card sales-tab">
      <h3>ยอดขายวันนี้ — ${data?.name || ''}</h3>
      <p class="sales-total">${total.toLocaleString()} <span>บาท</span></p>
      ${renderTransactions(txs)}
    </section>`;
}

function render() {
  $('#app').innerHTML = `
    <div class="phone">
      <header class="top">
        <div class="logo"><img src="/LOGOTB-circle.png" alt="TB Coffee"></div>
        <div class="titles">
          <h1>TB Coffee Dashboard</h1>
          <p>ระบบสะสมแต้มและบันทึกยอดขาย · อัปเดต ${META.updateDate}</p>
        </div>
        <div class="online"><i></i>ออนไลน์</div>
      </header>

      <section class="kpi">
        <article class="card kpi-card k-green">
          <p>ยอดขายวันนี้</p>
          <h2>${KPI.sales.toLocaleString()} <span>บาท</span></h2>
          ${chartSales}
        </article>
        <article class="card kpi-card k-blue">
          <p>แก้ววันนี้</p>
          <h2>${KPI.cups} <span>แก้ว</span></h2>
          ${chartCups}
        </article>
        <article class="card kpi-card k-purple">
          <p>ลูกค้าวันนี้</p>
          <h2>${KPI.customers} <span>คน</span></h2>
          ${chartCustomers}
        </article>
      </section>

      <nav class="tabs">
        <button type="button" class="tab ${state.tab === 'sales' ? 'active' : ''}" data-tab="sales">ยอดขาย</button>
        <button type="button" class="tab ${state.tab === 'customers' ? 'active' : ''}" data-tab="customers">ลูกค้า</button>
      </nav>

      <div class="search card">
        ${icon('search')}
        <input id="searchInput" type="search" placeholder="ค้นหาลูกค้า..." value="${state.query}">
        ${icon('filter')}
      </div>

      <div class="split ${state.tab}">
        <aside class="list card border-blue">
          <div class="list-scroll ${state.showAll || state.query ? 'expanded' : ''}" id="customerList">${customerListHTML()}</div>
          <button type="button" class="link-btn center" id="showAllBtn">${state.showAll ? 'แสดง Top 10' : `ดูทั้งหมด ${STATS.totalCustomers} คน`} →</button>
        </aside>
        <div class="detail-wrap" id="detailWrap">
          ${state.tab === 'customers' ? detailHTML() : salesTabHTML()}
        </div>
      </div>

      ${state.tab === 'customers' ? renderFormula() : ''}

      <section class="card paste border-orange ${state.pasteOpen ? 'open' : ''}" id="pasteSection">
        <button type="button" class="paste-head" id="pasteToggle">
          <span class="paste-ico">${icon('paste')}</span>
          <span>
            <strong>วางข้อมูลยอดขาย</strong>
            <small>วางข้อมูลยอดขายที่ต้องการคำนวณแต้ม</small>
          </span>
          <em class="arrow">›</em>
        </button>
        <div class="paste-body">
          <textarea id="pasteInput" placeholder="ตัวอย่างรูปแบบ:
19/06/2569
1. อเมริกาโน่ 40 บาท ป้าจอย
2. ลาเต้ 50 บาท ครูต๋อง
3. มอคค่า ฟรี ป้าจอย"></textarea>
          ${state.pasteMessage ? `<p class="paste-msg ${state.pasteError ? 'err' : 'ok'}">${state.pasteMessage}</p>` : ''}
          <button type="button" class="btn-confirm" id="btnConfirm">ยืนยันข้อมูล</button>
        </div>
      </section>

      <footer class="foot card border-mixed">
        <div><span>👥</span><small>ลูกค้าทั้งหมด</small><b>${STATS.totalCustomers} คน</b></div>
        <div><span>⭐</span><small>แต้มรวมทั้งหมด</small><b>${STATS.totalPoints.toLocaleString()} แต้ม</b></div>
        <div><span>🕒</span><small>อัปเดตล่าสุด</small><b>${META.updateDate}</b></div>
      </footer>
    </div>`;

  bind();
}

function bind() {
  $$('.tab').forEach((el) => el.addEventListener('click', () => {
    state.tab = el.dataset.tab;
    render();
  }));

  bindCustomerClicks();

  $('#searchInput')?.addEventListener('input', (e) => {
    state.query = e.target.value;
    $('#customerList').innerHTML = customerListHTML();
    bindCustomerClicks();
  });

  $('#showAllBtn')?.addEventListener('click', () => {
    state.showAll = !state.showAll;
    render();
  });

  $('#pasteToggle')?.addEventListener('click', () => {
    state.pasteOpen = !state.pasteOpen;
    $('#pasteSection').classList.toggle('open', state.pasteOpen);
  });

  $('#btnConfirm')?.addEventListener('click', () => {
    const raw = $('#pasteInput')?.value?.trim() ?? '';
    if (!raw) {
      state.pasteMessage = 'กรุณาวางข้อมูลยอดขายก่อนยืนยัน';
      state.pasteError = true;
      render();
      return;
    }

    const parsed = parseSalesText(raw, META.updateDate);
    const activeDay = parsed.days.at(-1);

    if (!activeDay?.items.length) {
      const sample = parsed.days[0]?.unparsedLines[0] || parsed.looseLines[0];
      state.pasteMessage = sample
        ? `อ่านข้อมูลไม่ได้: "${sample}" — ใช้รูปแบบ 1. อเมริกาโน่ 40 บาท ป้าจอย`
        : 'ไม่พบรายการสั่งซื้อ — ใช้รูปแบบ 1. อเมริกาโน่ 40 บาท ป้าจอย';
      state.pasteError = true;
      render();
      return;
    }

    if (activeDay.date) META.updateDate = activeDay.date;

    const summary = summarizeDay(activeDay);
    const result = applyDailySales(activeDay.items);
    updateKpi(summary);

    const warningText = result.warnings.length
      ? ` (ข้าม ${result.warnings.length} รายการ)`
      : '';
    state.pasteMessage = `อัปเดต ${result.appliedCount} รายการ · ${result.customerCount} ลูกค้า · ยอดขาย ${summary.totalRevenue.toLocaleString()} บาท${warningText}`;
    state.pasteError = result.warnings.length > 0;

    const firstMatch = activeDay.items
      .map((item) => findCustomer(item.customerName))
      .find(Boolean);
    if (firstMatch) state.selected = firstMatch.name;

    state.pasteOpen = false;
    render();
  });
}

function bindCustomerClicks() {
  $$('.customer-item').forEach((el) => el.addEventListener('click', () => {
    state.selected = el.dataset.name;
    render();
  }));
}

render();
