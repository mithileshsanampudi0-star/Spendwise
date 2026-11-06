const { runWith } = require('../utils/context');

/**
 * Lets the API compute "today" in the user's calendar instead of the server's UTC day.
 * The client sends X-Client-Date: YYYY-MM-DD. Values far from the real date are ignored.
 */
module.exports = (req, _res, next) => {
  const header = req.headers['x-client-date'];
  let today = null;
  if (typeof header === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(header)) {
    const d = new Date(`${header}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime()) && Math.abs(d.getTime() - Date.now()) < 3 * 86400000) today = d;
  }
  runWith({ today }, next);
};
