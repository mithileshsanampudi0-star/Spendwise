const path = require('path');
const mongoose = require('mongoose');
const supertest = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

let mongod;
let agentBase;

/** Connects to TEST_MONGO_URI if set, otherwise starts an in-memory MongoDB. */
async function setup() {
  let uri = process.env.TEST_MONGO_URI;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('spendwise_test');
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  agentBase = require(path.join(__dirname, '..', '..', 'app'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch(() => {})));
  return agentBase;
}

async function teardown() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

const CSRF = { 'X-Requested-With': 'SpendWise' };
let counter = 0;

/** A logged-in client that keeps its session cookie, like a browser. */
async function newUser(app, name = 'User') {
  counter += 1;
  const agent = supertest.agent(app);
  const email = `${name.toLowerCase()}${counter}@test.com`;
  const res = await agent.post('/api/auth/register').set(CSRF).send({ name, email, password: 'secret1' });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  const call = (method, url, body, headers = {}) => {
    const r = agent[method](url).set({ ...CSRF, ...headers });
    return body !== undefined ? r.send(body) : r;
  };
  return { agent, email, user: res.body.data.user, get: (u, h) => call('get', u, undefined, h), post: (u, b, h) => call('post', u, b ?? {}, h), put: (u, b) => call('put', u, b), del: (u) => call('delete', u) };
}

const isoDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);

module.exports = { setup, teardown, newUser, CSRF, isoDay, monthKey };
