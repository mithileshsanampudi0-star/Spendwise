const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/** Per-request context (currently just the client's "today"). */
const runWith = (store, fn) => als.run(store, fn);
const getStore = () => als.getStore() || {};

module.exports = { runWith, getStore };
