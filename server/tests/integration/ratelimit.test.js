process.env.RATE_LIMIT_TEST = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { setup, teardown } = require('./helper');

let app;
before(async () => { app = await setup(); });
after(async () => { await teardown(); });

test('login is rate limited after 10 failed attempts', async () => {
  let last;
  for (let i = 0; i < 11; i += 1) {
    last = await supertest(app).post('/api/auth/login').send({ email: 'x@test.com', password: 'wrongpass' });
  }
  assert.equal(last.status, 429);
  assert.match(last.body.message, /Too many/);
});

test('forgot-password is rate limited after 5 requests', async () => {
  let last;
  for (let i = 0; i < 6; i += 1) last = await supertest(app).post('/api/auth/forgot-password').send({ email: 'x@test.com' });
  assert.equal(last.status, 429);
});
