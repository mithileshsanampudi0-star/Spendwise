const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;
const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

/** Sends the reset link by email when SMTP is configured; otherwise logs it (development). */
async function sendPasswordReset(to, link) {
  const t = getTransporter();
  if (!t) {
    logger.info('SMTP not configured. Password reset link (development only):', { to, link });
    return { sent: false };
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || 'SpendWise <no-reply@spendwise.app>',
    to,
    subject: 'Reset your SpendWise password',
    text: `Use this link to reset your password (valid for 30 minutes):\n\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
  });
  return { sent: true };
}

module.exports = { sendPasswordReset };
