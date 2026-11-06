const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = () => LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'test' ? LEVELS.error : LEVELS.info);

const write = (level, message, meta) => {
  if (LEVELS[level] > threshold()) return;
  const entry = { time: new Date().toISOString(), level, message, ...(meta ? { meta } : {}) };
  const line = process.env.NODE_ENV === 'production' ? JSON.stringify(entry) : `[${entry.time}] ${level.toUpperCase()} ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  (level === 'error' || level === 'warn' ? console.error : console.log)(line);
};

module.exports = {
  error: (m, meta) => write('error', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  info: (m, meta) => write('info', m, meta),
  debug: (m, meta) => write('debug', m, meta),
};
