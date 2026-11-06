/**
 * DEMO MODE seed script.
 * Creates a clearly labelled demo account with sample data so the app can be explored.
 * Run:  npm run seed
 * Login: demo@spendwise.app / Demo@1234
 * It only touches the demo account; the sample records are fake by design.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { resetFixedDemo } = require('../services/demoService');

(async () => {
  await connectDB();
  const user = await resetFixedDemo();
  console.log(`Demo account ready: ${user.email} / Demo@1234`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
