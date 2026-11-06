const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { setup, teardown, newUser, CSRF, isoDay, monthKey } = require('./helper');

let app;
before(async () => { app = await setup(); });
after(async () => { await teardown(); });

const expense = (o = {}) => ({ title: 'Lunch', amount: 250, category: 'Food', date: isoDay(0), ...o });

describe('auth and sessions', () => {
  test('register sets an httpOnly cookie and never returns a token or password', async () => {
    const res = await supertest(app).post('/api/auth/register').set(CSRF).send({ name: 'Cookie', email: 'cookie@test.com', password: 'secret1' });
    assert.equal(res.status, 201);
    const cookie = (res.headers['set-cookie'] || []).join(';');
    assert.match(cookie, /sw_token=/);
    assert.match(cookie, /HttpOnly/i);
    assert.equal(res.body.data.token, undefined);
    assert.equal(res.body.data.user.password, undefined);
  });

  test('duplicate email, bad login and unauthenticated access are rejected', async () => {
    await newUser(app, 'Dup');
    const dup = await supertest(app).post('/api/auth/register').send({ name: 'Dup', email: 'dup1@test.com', password: 'secret1' });
    assert.equal(dup.status, 409);
    assert.equal((await supertest(app).post('/api/auth/login').send({ email: 'dup1@test.com', password: 'wrong' })).status, 401);
    assert.equal((await supertest(app).get('/api/auth/me')).status, 401);
  });

  test('cookie-authenticated writes need the CSRF header; reads do not', async () => {
    const u = await newUser(app, 'Csrf');
    const noHeader = await u.agent.post('/api/expenses').send(expense());
    assert.equal(noHeader.status, 403);
    assert.equal((await u.agent.get('/api/expenses')).status, 200);
    assert.equal((await u.post('/api/expenses', expense())).status, 201);
  });

  test('logout clears the session', async () => {
    const u = await newUser(app, 'Out');
    assert.equal((await u.post('/api/auth/logout')).status, 200);
    assert.equal((await u.get('/api/auth/me')).status, 401);
  });

  test('changing the password signs out other sessions', async () => {
    const u = await newUser(app, 'Pw');
    const other = supertest.agent(app);
    await other.post('/api/auth/login').send({ email: u.email, password: 'secret1' });
    assert.equal((await other.get('/api/auth/me')).status, 200);
    await new Promise((r) => setTimeout(r, 1100)); // JWT iat has 1s resolution
    assert.equal((await u.put('/api/auth/password', { currentPassword: 'secret1', newPassword: 'secret2' })).status, 200);
    assert.equal((await other.get('/api/auth/me')).status, 401);
    assert.equal((await u.get('/api/auth/me')).status, 200); // this session got a fresh cookie
  });

  test('password reset: same answer for unknown emails, single-use token, new password works', async () => {
    const u = await newUser(app, 'Reset');
    const unknown = await supertest(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.com' });
    const known = await supertest(app).post('/api/auth/forgot-password').send({ email: u.email });
    assert.equal(unknown.status, 200);
    assert.equal(known.body.message, unknown.body.message);
    const token = known.body.devResetLink.split('token=')[1];
    assert.equal(unknown.body.devResetLink, undefined);

    assert.equal((await supertest(app).post('/api/auth/reset-password').send({ token: 'bad', password: 'newpass1' })).status, 400);
    assert.equal((await supertest(app).post('/api/auth/reset-password').send({ token, password: 'newpass1' })).status, 200);
    assert.equal((await supertest(app).post('/api/auth/reset-password').send({ token, password: 'again123' })).status, 400);
    assert.equal((await supertest(app).post('/api/auth/login').send({ email: u.email, password: 'newpass1' })).status, 200);
    assert.equal((await supertest(app).post('/api/auth/login').send({ email: u.email, password: 'secret1' })).status, 401);
  });

  test('one-click demo creates a private, pre-filled account', async () => {
    const agent = supertest.agent(app);
    const res = await agent.post('/api/auth/demo').send({});
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.isDemo, true);
    const list = await agent.get('/api/expenses?limit=5');
    assert.ok(list.body.pagination.total > 20);
    const rec = await agent.get('/api/recurring');
    assert.ok(rec.body.data.length >= 2);
    const again = await supertest.agent(app).post('/api/auth/demo').send({});
    assert.notEqual(again.body.data.user._id, res.body.data.user._id);
  });
});

describe('expenses', () => {
  test('create, validate, search, sort, paginate', async () => {
    const u = await newUser(app, 'Exp');
    assert.equal((await u.post('/api/expenses', expense({ amount: -5 }))).status, 400);
    assert.equal((await u.post('/api/expenses', expense({ category: 'Nope' }))).status, 400);
    assert.equal((await u.post('/api/expenses', expense({ date: 'garbage' }))).status, 400);
    for (const [title, amount] of [['Coffee', 100], ['Pizza', 600], ['Taxi', 300]]) {
      assert.equal((await u.post('/api/expenses', expense({ title, amount }))).status, 201);
    }
    const sorted = await u.get('/api/expenses?sortBy=amount&order=desc&limit=2');
    assert.deepEqual(sorted.body.data.map((e) => e.title), ['Pizza', 'Taxi']);
    assert.equal(sorted.body.pagination.pages, 2);
    assert.equal(sorted.body.summary.totalAmount, 1000);
    assert.equal((await u.get('/api/expenses?search=piz')).body.data.length, 1);
    assert.equal((await u.get('/api/expenses?search=.*')).body.pagination.total, 0); // regex is escaped
  });

  test('soft delete hides everywhere, restore brings it back, double delete is 404', async () => {
    const u = await newUser(app, 'Soft');
    const id = (await u.post('/api/expenses', expense({ amount: 400 }))).body.data._id;
    const range = `from=${isoDay(-1)}&to=${isoDay(1)}`;
    assert.equal((await u.get(`/api/analytics/summary?${range}`)).body.data.total, 400);

    assert.equal((await u.del(`/api/expenses/${id}`)).status, 200);
    assert.equal((await u.get('/api/expenses')).body.pagination.total, 0);
    assert.equal((await u.get(`/api/analytics/summary?${range}`)).body.data.total, 0);
    assert.equal((await u.get(`/api/expenses/${id}`)).status, 404);
    assert.equal((await u.del(`/api/expenses/${id}`)).status, 404);

    assert.equal((await u.post(`/api/expenses/${id}/restore`)).status, 200);
    assert.equal((await u.get(`/api/analytics/summary?${range}`)).body.data.total, 400);
    assert.equal((await u.post(`/api/expenses/${id}/restore`)).status, 404); // not deleted any more
  });

  test('NoSQL operators in query strings and bodies are neutralised', async () => {
    const u = await newUser(app, 'Inj');
    await u.post('/api/expenses', expense());
    const q = await u.get('/api/expenses?category[$ne]=zzz&search[$regex]=.*');
    assert.notEqual(q.status, 500);
    assert.ok(q.body.pagination.total <= 1);
    const login = await supertest(app).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(login.status, 400);
  });
});

describe('ownership isolation', () => {
  test('one user can never read, change, delete or restore another user\'s records', async () => {
    const a = await newUser(app, 'Alice');
    const b = await newUser(app, 'Bob');
    const exp = (await a.post('/api/expenses', expense())).body.data;
    const inc = (await a.post('/api/income', { title: 'Pay', amount: 1000, category: 'Salary', date: isoDay(0) })).body.data;
    const rec = (await a.post('/api/recurring', { type: 'expense', title: 'Gym', amount: 500, category: 'Healthcare', frequency: 'monthly', startDate: isoDay(5) })).body.data;
    const bud = (await a.post('/api/budgets', { category: 'Food', amount: 5000 })).body.data;
    const goal = (await a.post('/api/savings', { name: 'Trip', targetAmount: 1000 })).body.data;
    const cat = (await a.post('/api/categories', { name: 'Pets' })).body.data;

    const targets = [['expenses', exp], ['income', inc], ['recurring', rec], ['budgets', bud], ['savings', goal], ['categories', cat]];
    for (const [path, doc] of targets) {
      assert.equal((await b.put(`/api/${path}/${doc._id}`, { title: 'hacked', amount: 1 })).status, 404, `PUT ${path}`);
      assert.equal((await b.del(`/api/${path}/${doc._id}`)).status, 404, `DELETE ${path}`);
    }
    assert.equal((await b.get(`/api/expenses/${exp._id}`)).status, 404);
    assert.equal((await b.get(`/api/income/${inc._id}`)).status, 404);

    await a.del(`/api/expenses/${exp._id}`);
    assert.equal((await b.post(`/api/expenses/${exp._id}/restore`)).status, 404);

    assert.equal((await b.get('/api/expenses')).body.pagination.total, 0);
    assert.equal((await b.get('/api/income')).body.pagination.total, 0);
    assert.equal((await b.get('/api/recurring')).body.data.length, 0);
    assert.equal((await b.get('/api/savings')).body.data.length, 0);
    const mine = await a.get(`/api/budgets`);
    assert.equal(mine.body.data[0].amount, 5000); // untouched
    assert.equal((await b.get('/api/expenses/not-an-id')).status, 400);
  });
});

describe('income and cash flow', () => {
  test('income CRUD validates sources and feeds cash flow', async () => {
    const u = await newUser(app, 'Inc');
    assert.equal((await u.post('/api/income', { title: 'x', amount: 5, category: 'Lottery', date: isoDay(0) })).status, 400);
    const id = (await u.post('/api/income', { title: 'Salary', amount: 50000, category: 'Salary', date: isoDay(0) })).body.data._id;
    await u.post('/api/expenses', expense({ amount: 12500 }));
    const flow = (await u.get(`/api/analytics/cashflow?from=${isoDay(-1)}&to=${isoDay(1)}`)).body.data;
    assert.equal(flow.income, 50000);
    assert.equal(flow.expenses, 12500);
    assert.equal(flow.net, 37500);
    assert.equal(flow.savingsRate, 75);
    assert.equal((await u.put(`/api/income/${id}`, { amount: 60000 })).body.data.amount, 60000);
    assert.equal((await u.get('/api/meta')).body.data.incomeSources.includes('Salary'), true);
  });
});

describe('budgets, categories, analytics', () => {
  test('budget status reflects spending and ignores deleted expenses', async () => {
    const u = await newUser(app, 'Bud');
    await u.post('/api/budgets', { category: 'Food', amount: 1000 });
    assert.equal((await u.post('/api/budgets', { category: 'Food', amount: 900 })).status, 409);
    const e = (await u.post('/api/expenses', expense({ amount: 850 }))).body.data;
    let b = (await u.get('/api/budgets')).body.data[0];
    assert.equal(b.spent, 850);
    await u.del(`/api/expenses/${e._id}`);
    b = (await u.get('/api/budgets')).body.data[0];
    assert.equal(b.spent, 0);
  });

  test('renaming a category updates expenses and recurring rules; deleting moves them to Other', async () => {
    const u = await newUser(app, 'Cat');
    const cat = (await u.post('/api/categories', { name: 'Pets' })).body.data;
    await u.post('/api/expenses', expense({ category: 'Pets' }));
    await u.post('/api/recurring', { type: 'expense', title: 'Vet plan', amount: 300, category: 'Pets', frequency: 'monthly', startDate: isoDay(10) });
    await u.put(`/api/categories/${cat._id}`, { name: 'Animals' });
    assert.equal((await u.get('/api/expenses?category=Animals')).body.pagination.total, 1);
    assert.equal((await u.get('/api/recurring')).body.data[0].category, 'Animals');
    await u.del(`/api/categories/${cat._id}`);
    assert.equal((await u.get('/api/expenses?category=Other')).body.pagination.total, 1);
    assert.equal((await u.get('/api/recurring')).body.data[0].category, 'Other');
  });

  test('summary, category totals, trends and heatmap agree', async () => {
    const u = await newUser(app, 'Ana');
    await u.post('/api/expenses', expense({ amount: 200 }));
    await u.post('/api/expenses', expense({ amount: 300, category: 'Travel' }));
    const range = `from=${isoDay(-2)}&to=${isoDay(0)}`;
    assert.equal((await u.get(`/api/analytics/summary?${range}`)).body.data.total, 500);
    const cats = (await u.get(`/api/analytics/categories?${range}`)).body.data;
    assert.equal(cats[0].category, 'Travel');
    assert.equal(cats.reduce((s, c) => s + c.total, 0), 500);
    const heat = (await u.get(`/api/analytics/heatmap?${range}`)).body.data;
    assert.equal(heat.reduce((s, d) => s + d.total, 0), 500);
    assert.equal((await u.get('/api/analytics/summary')).status, 400);
  });

  test('forecast and health score explain themselves and refuse to guess on thin data', async () => {
    const u = await newUser(app, 'Fh');
    const thin = (await u.get('/api/analytics/forecast')).body.data;
    assert.equal(thin.sufficient, false);
    assert.equal((await u.get('/api/analytics/health')).body.data.sufficient, false);

    const demo = supertest.agent(app);
    await demo.post('/api/auth/demo').send({});
    const h = (await demo.get('/api/analytics/health')).body.data;
    assert.equal(h.sufficient, true);
    assert.ok(h.score >= 0 && h.score <= 100);
    assert.ok(Array.isArray(h.components) && h.components.length >= 2);
    const f = (await demo.get('/api/analytics/forecast')).body.data;
    assert.ok(f.sufficient === true || typeof f.reason === 'string');
    const ins = (await demo.get('/api/insights')).body.data;
    assert.ok(ins.insights.length > 0);
  });
});

describe('recurring rules', () => {
  test('a rule that started earlier posts each missed occurrence exactly once', async () => {
    const u = await newUser(app, 'Rec');
    const start = isoDay(-15);
    const res = await u.post('/api/recurring', { type: 'expense', title: 'Weekly cleaner', amount: 400, category: 'Other', frequency: 'weekly', startDate: start });
    assert.equal(res.status, 201);
    const count = (await u.get('/api/expenses?search=cleaner')).body.pagination.total;
    assert.equal(count, 3); // day -15, -8, -1
    await u.post('/api/recurring/run');
    await u.post('/api/recurring/run');
    assert.equal((await u.get('/api/expenses?search=cleaner')).body.pagination.total, 3);
    const rule = (await u.get('/api/recurring')).body.data[0];
    assert.ok(new Date(rule.nextDate) > new Date());
  });

  test('concurrent runs never double-post', async () => {
    const u = await newUser(app, 'Race');
    await u.post('/api/recurring', { type: 'income', title: 'Retainer', amount: 900, category: 'Freelance', frequency: 'weekly', startDate: isoDay(-1) });
    await Promise.all([u.post('/api/recurring/run'), u.post('/api/recurring/run'), u.post('/api/recurring/run')]);
    assert.equal((await u.get('/api/income?search=Retainer')).body.pagination.total, 1);
  });

  test('pause, edit and delete a rule; history is kept', async () => {
    const u = await newUser(app, 'Pause');
    const id = (await u.post('/api/recurring', { type: 'expense', title: 'Netflix', amount: 649, category: 'Entertainment', frequency: 'monthly', startDate: isoDay(-1) })).body.data._id;
    assert.equal((await u.put(`/api/recurring/${id}`, { active: false, amount: 700 })).body.data.active, false);
    assert.equal((await u.post('/api/recurring', { type: 'expense', title: 'x', amount: 5, category: 'Nope', frequency: 'monthly', startDate: isoDay(1) })).status, 400);
    assert.equal((await u.del(`/api/recurring/${id}`)).status, 200);
    assert.equal((await u.get('/api/expenses?search=Netflix')).body.pagination.total, 1);
  });

  test('detected subscriptions come from repeating charges', async () => {
    const demo = supertest.agent(app);
    await demo.post('/api/auth/demo').send({});
    const found = (await demo.get('/api/recurring/detected')).body.data;
    assert.ok(found.length >= 1);
    assert.ok(found[0].amount > 0);
  });
});

describe('import', () => {
  test('quick-add parses a sentence into a draft without saving anything', async () => {
    const u = await newUser(app, 'Quick');
    const res = await u.post('/api/import/quick', { text: 'coffee 120 yesterday upi' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.amount, 120);
    assert.equal(res.body.data.date, isoDay(-1));
    assert.equal((await u.post('/api/import/quick', { text: 'hello there' })).status, 422);
    assert.equal((await u.get('/api/expenses')).body.pagination.total, 0);
  });

  test('CSV preview categorises and flags duplicates; commit validates again', async () => {
    const u = await newUser(app, 'Csv');
    await u.post('/api/expenses', expense({ title: 'Swiggy order', amount: 450, date: '2026-10-03' }));
    const csv = ['Date,Description,Debit,Credit', '03/10/2026,Swiggy order,450,', '04/10/2026,Uber ride,230,', '05/10/2026,Salary credit,,60000'].join('\n');
    const prev = await u.post('/api/import/preview', { csv });
    assert.equal(prev.status, 200);
    const rows = prev.body.data.rows;
    assert.equal(rows.length, 3);
    assert.equal(rows[0].duplicate, true);
    assert.equal(rows[1].category, 'Travel');
    assert.equal(rows[2].type, 'income');

    const bad = [...rows.filter((r) => !r.duplicate), { date: 'x', title: 'bad', amount: 5, type: 'expense', category: 'Food' }];
    const done = await u.post('/api/import/commit', { rows: bad });
    assert.equal(done.status, 201);
    assert.equal(done.body.data.expenses, 1);
    assert.equal(done.body.data.income, 1);
    assert.equal(done.body.data.rejected.length, 1);
    assert.equal((await u.post('/api/import/preview', { csv: 'nothing useful here' })).status, 422);
    assert.equal((await u.post('/api/import/commit', { rows: [] })).status, 400);
  });
});

describe('reports', () => {
  test('monthly report includes income, net and ignores deleted rows', async () => {
    const u = await newUser(app, 'Rep');
    await u.post('/api/income', { title: 'Pay', amount: 1000, category: 'Salary', date: isoDay(0) });
    const e = (await u.post('/api/expenses', expense({ amount: 300 }))).body.data;
    await u.post('/api/expenses', expense({ amount: 100 }));
    await u.del(`/api/expenses/${e._id}`);
    const r = (await u.get(`/api/reports/monthly?month=${monthKey()}`)).body.data;
    assert.equal(r.totalExpenses, 100);
    assert.equal(r.totalIncome, 1000);
    assert.equal(r.net, 900);
    assert.equal(r.incomes.length, 1);
    assert.equal(r.expenses.length, 1);
  });
});

describe('client date', () => {
  test('X-Client-Date sets "today" for the user, but only within 3 days of real time', async () => {
    const u = await newUser(app, 'Tz');
    await u.post('/api/recurring', { type: 'expense', title: 'Tomorrow rule', amount: 50, category: 'Other', frequency: 'monthly', startDate: isoDay(1) });
    assert.equal((await u.get('/api/expenses?search=Tomorrow')).body.pagination.total, 0);
    await u.post('/api/recurring/run', {}, { 'X-Client-Date': isoDay(1) });
    assert.equal((await u.get('/api/expenses?search=Tomorrow')).body.pagination.total, 1);

    const far = await newUser(app, 'Far');
    await far.post('/api/recurring', { type: 'expense', title: 'Far rule', amount: 50, category: 'Other', frequency: 'monthly', startDate: isoDay(30) });
    await far.post('/api/recurring/run', {}, { 'X-Client-Date': isoDay(30) });
    assert.equal((await far.get('/api/expenses?search=Far')).body.pagination.total, 0);
  });
});

test('unknown routes and malformed JSON return clean JSON errors', async () => {
  const nf = await supertest(app).get('/api/nope');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.success, false);
  const bad = await supertest(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops');
  assert.equal(bad.status, 400);
});
