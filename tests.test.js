'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('FAIL: no <script> block found in index.html');
  process.exit(1);
}
const src = match[1];

const api = new Function(
  src + `
  return {
    STATUSES, statusLabel, isValidStatus, todayYMD, parseYMD, diffDays,
    daysUntil, chipFor, paidOf, balanceOf, fmtMoney, totalsFor,
    beginOfWeek, weeklyQueue, makeOrder, validateOrder,
    loadAll, setOrders, saveAll, toCSV, confirmationText
  };`
)();

const A = api;
let passed = 0;
let failed = 0;

function t(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ok  ' + name);
  } catch (err) {
    failed += 1;
    console.error('  FAIL ' + name + ' :: ' + err.message);
  }
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'value') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function deepEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error((msg || 'value') + ': expected ' + b + ', got ' + a);
}

console.log('status helpers');
t('labels every known status id', () => {
  eq(A.statusLabel('quote'), 'Quote sent');
  eq(A.statusLabel('deposit'), 'Deposit in');
  eq(A.statusLabel('making'), 'In the making');
  eq(A.statusLabel('done'), 'Done');
  eq(A.statusLabel('shipped'), 'Shipped');
});
t('statusLabel throws on unknown status', () => {
  let threw = false;
  try { A.statusLabel('archived'); } catch (e) { threw = true; }
  eq(threw, true);
});
t('isValidStatus accepts known, rejects unknown', () => {
  eq(A.isValidStatus('making'), true);
  eq(A.isValidStatus(''), false);
  eq(A.isValidStatus('SHIPPED'), false);
  eq(A.isValidStatus(undefined), false);
});

console.log('dates and countdown');
t('daysUntil: same day, tomorrow, yesterday, missing', () => {
  eq(A.daysUntil('2026-10-28', '2026-10-28'), 0);
  eq(A.daysUntil('2026-10-29', '2026-10-28'), 1);
  eq(A.daysUntil('2026-10-27', '2026-10-28'), -1);
  eq(A.daysUntil('', '2026-10-28'), null);
  eq(A.daysUntil(undefined, '2026-10-28'), null);
});
t('daysUntil spans month and year boundaries', () => {
  eq(A.daysUntil('2026-11-01', '2026-10-28'), 4);
  eq(A.daysUntil('2027-01-01', '2026-12-31'), 1);
});
t('chipFor kinds and labels', () => {
  const today = '2026-10-28';
  deepEq(A.chipFor({ deadline: '2026-10-25' }, today), { kind: 'over', label: 'Overdue by 3d' });
  deepEq(A.chipFor({ deadline: '2026-10-28' }, today), { kind: 'over', label: 'Due today' });
  deepEq(A.chipFor({ deadline: '2026-10-29' }, today), { kind: 'soon', label: 'Due in 1 day' });
  deepEq(A.chipFor({ deadline: '2026-11-03' }, today), { kind: 'soon', label: 'Due in 6 days' });
  deepEq(A.chipFor({ deadline: '2026-11-04' }, today), { kind: 'soon', label: 'Due in 7 days' });
  deepEq(A.chipFor({ deadline: '2026-11-05' }, today), { kind: 'ok', label: 'Due in 8 days' });
  deepEq(A.chipFor({ deadline: '' }, today), { kind: 'none', label: 'No deadline' });
});

console.log('money math');
function order(title, total, payments, status, deadline, extra) {
  return Object.assign(
    {
      id: 'x_' + title, title: title, client: 'Client ' + title, item: '',
      total: total, payments: payments, status: status || 'making', deadline: deadline || '',
      notes: '', createdAt: '2026-10-01', updatedAt: '2026-10-20'
    },
    extra || {}
  );
}
t('paidOf sums payments, balanceOf subtracts', () => {
  const o = order('A', 300, [{ amount: 100, date: '2026-10-05' }, { amount: 50, date: '2026-10-12' }]);
  eq(A.paidOf(o), 150);
  eq(A.balanceOf(o), 150);
});
t('balance never goes negative', () => {
  const o = order('B', 100, [{ amount: 120, date: '2026-10-05' }]);
  eq(A.balanceOf(o), 0);
});
t('totalsFor aggregates value, paid, balance and per-lane counts', () => {
  const orders = [
    order('One', 300, [{ amount: 100, date: '2026-10-05' }], 'quote'),
    order('Two', 500, [], 'making'),
    order('Three', 200, [{ amount: 200, date: '2026-10-10' }], 'shipped')
  ];
  const t = A.totalsFor(orders);
  eq(t.count, 3);
  eq(t.value, 1000);
  eq(t.paid, 300);
  eq(t.balance, 700);
  eq(t.byStatus.quote.count, 1);
  eq(t.byStatus.making.count, 1);
  eq(t.byStatus.shipped.count, 1);
  eq(t.byStatus.quote.value, 300);
  eq(t.byStatus.making.balance, 500);
  eq(t.byStatus.shipped.balance, 0);
});
t('totalsFor handles empty list', () => {
  const t = A.totalsFor([]);
  eq(t.value, 0); eq(t.paid, 0); eq(t.balance, 0); eq(t.count, 0);
});
t('fmtMoney uses USD formatting', () => {
  eq(A.fmtMoney(1234.5), '$1,234.50');
  eq(A.fmtMoney(0), '$0.00');
});

console.log('weekly queue');
t('beginOfWeek returns ISO Monday', () => {
  eq(A.beginOfWeek('2026-10-28'), '2026-10-26'); // Wednesday -> Monday
  eq(A.beginOfWeek('2026-10-25'), '2026-10-19'); // Sunday -> previous Monday
});
t('weeklyQueue: lane counts, due-this-week, overdue, deposits', () => {
  const orders = [
    { id: 'a', title: 'Mug set', total: 120, payments: [{ amount: 60, date: '2026-10-26' }], status: 'deposit', deadline: '2026-10-29' },
    { id: 'b', title: 'Late clock', total: 80, payments: [], status: 'making', deadline: '2026-10-20' },
    { id: 'c', title: 'Far quilt', total: 900, payments: [], status: 'quote', deadline: '2026-11-30' },
    { id: 'd', title: 'Shipped order', total: 50, payments: [], status: 'shipped', deadline: '2026-10-28' }
  ];
  const wq = A.weeklyQueue(orders, '2026-10-28');
  deepEq(wq.byStatus, { quote: 1, deposit: 1, making: 1, done: 0, shipped: 1 });
  eq(wq.weekStart, '2026-10-26');
  eq(wq.weekEnd, '2026-11-01');
  deepEq(wq.dueThisWeek.map(function (o) { return o.title; }), ['Shipped order', 'Mug set']);
  eq(wq.overdueCount, 1);
  eq(wq.depositsThisWeek, 60);
});
t('weeklyQueue balance due excludes shipped orders', () => {
  const orders = [
    { id: 'a', title: 'Open', total: 200, payments: [{ amount: 50, date: '2026-10-01' }], status: 'making', deadline: '' },
    { id: 'b', title: 'Done deal', total: 100, payments: [], status: 'shipped', deadline: '' }
  ];
  const wq = A.weeklyQueue(orders, '2026-10-28');
  eq(wq.balanceDueOpen, 150);
});
t('weeklyQueue with no orders', () => {
  const wq = A.weeklyQueue([], '2026-10-28');
  eq(wq.dueThisWeek.length, 0);
  eq(wq.overdueCount, 0);
  eq(wq.depositsThisWeek, 0);
  eq(wq.balanceDueOpen, 0);
});

console.log('order shape and validation');
t('makeOrder starts in quote lane with id and timestamps', () => {
  const o = A.makeOrder({ title: 'Cherry box', total: 250 });
  eq(o.status, 'quote');
  eq(o.title, 'Cherry box');
  eq(typeof o.id, 'string');
  eq(o.id.length > 0, true);
  eq(/^\d{4}-\d{2}-\d{2}$/.test(o.createdAt), true);
  deepEq(o.payments, []);
});
t('validateOrder: good order has no errors', () => {
  deepEq(A.validateOrder({ title: 'Mug', total: 100, deadline: '', status: 'quote' }), []);
});
t('validateOrder: title required', () => {
  const errs = A.validateOrder({ title: '   ', total: 100 });
  eq(errs.some(function (e) { return e.indexOf('title') !== -1; }), true);
});
t('validateOrder: total required and non-negative', () => {
  let errs = A.validateOrder({ title: 'Mug' });
  eq(errs.some(function (e) { return e.indexOf('Total price is required') !== -1; }), true);
  errs = A.validateOrder({ title: 'Mug', total: -5 });
  eq(errs.some(function (e) { return e.indexOf('zero or more') !== -1; }), true);
});
t('validateOrder: bad status caught', () => {
  const errs = A.validateOrder({ title: 'Mug', total: 10, status: 'bogus' });
  eq(errs.length, 1);
});

console.log('csv export and confirmation note');
t('toCSV escapes commas, quotes and newlines', () => {
  const rows = A.toCSV([
    order('Board, "fancy"', 120, [{ amount: 30, date: '2026-10-01' }], 'quote', '2026-11-01', { client: 'Riley', item: 'cutting board', notes: 'line one\nline two, with comma' })
  ]);
  const lines = rows.split('\n');
  eq(lines[0], 'Title,Client,Item,Status,Deadline,Total,Paid,Balance,Notes');
  // the newline inside notes splits the record across lines 2-3, matching RFC 4180
  eq(lines[1] + '\n' + lines[2],
    '"Board, ""fancy""",Riley,cutting board,Quote sent,2026-11-01,120.00,30.00,90.00,"line one\nline two, with comma"');
});
t('toCSV header only when empty', () => {
  eq(A.toCSV([]), 'Title,Client,Item,Status,Deadline,Total,Paid,Balance,Notes');
});
t('confirmation note includes client, status, balance', () => {
  const o = order('Desk sign', 400, [{ amount: 200, date: '2026-10-03' }], 'making', '2026-11-15', { client: 'Jules', notes: 'Walnut preferred' });
  const text = A.confirmationText(o, 'Asdale Woodworks');
  eq(text.indexOf('Hi Jules!') !== -1, true);
  eq(text.indexOf('Current status: In the making.') !== -1, true);
  eq(text.indexOf('$200.00') !== -1, true);
  eq(text.indexOf('$200.00\n') !== -1 || text.indexOf('Balance remaining: $200.00') !== -1, true);
  eq(text.indexOf('Expected finish: 2026-11-15') !== -1, true);
  eq(text.indexOf('Walnut preferred') !== -1, true);
  eq(text.indexOf('— Asdale Woodworks') !== -1, true);
});
t('confirmation note falls back to "there" and maker default', () => {
  const o = order('Thing', 10, [], 'quote', '', { client: '' });
  const text = A.confirmationText(o, '');
  eq(text.indexOf('Hi there!') !== -1, true);
  eq(text.indexOf('— Your maker') !== -1, true);
});

console.log('storage round-trip via loadAll/setOrders');
const storedM = {};
const storeStub = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(storedM, k) ? storedM[k] : null; },
  setItem: function (k, v) { storedM[k] = String(v); }
};
global.localStorage = storeStub;
// re-evaluate script so $store binds to our stub
const api2 = new Function(
  src + '\nreturn { loadAll, setOrders, saveAll, makeOrder, shiftOrder, statusLabel };'
)();
t('loadAll starts empty', () => {
  const all = api2.loadAll();
  deepEq(all.orders, []);
  deepEq(all.settings, { makerName: '' });
});
t('setOrders persists and loadAll reads it back', () => {
  const o = {
    id: 'o1', title: 'Framed print', client: 'Sam', item: '',
    total: 180, deadline: '2026-12-01', status: 'deposit',
    notes: 'Frame in oak', payments: [{ amount: 90, date: '2026-10-28' }],
    createdAt: '2026-10-27', updatedAt: '2026-10-28'
  };
  api2.setOrders([o]);
  const back = api2.loadAll();
  eq(back.orders.length, 1);
  eq(back.orders[0].title, 'Framed print');
  eq(back.orders[0].payments[0].amount, 90);
});
t('shiftOrder moves status forward and clamps at the ends', () => {
  api2.setOrders([api2.makeOrder({ title: 'Sled', total: 150, createdAt: '2026-10-01', deadline: '' })]);
  const id = api2.loadAll().orders[0].id;
  let all = api2.shiftOrder(id, 1);
  eq(all.orders[0].status, 'deposit');
  all = api2.shiftOrder(id, 1); all = api2.shiftOrder(id, 1); all = api2.shiftOrder(id, 1);
  eq(all.orders[0].status, 'shipped');
  all = api2.shiftOrder(id, 1); // clamped
  eq(all.orders[0].status, 'shipped');
  all = api2.shiftOrder(id, -99);
  eq(all.orders[0].status, 'quote');
  eq(api2.shiftOrder('no-such-id', 1), null);
});
t('loadAll repairs corrupted storage', () => {
  storedM['custom-order-tracker.v1'] = '{not json';
  const back = api2.loadAll();
  deepEq(back.orders, []);
  storedM['custom-order-tracker.v1'] = '{"orders":"bogus"}';
  eq(Array.isArray(api2.loadAll().orders), true);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
