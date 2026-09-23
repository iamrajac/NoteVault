const nodemailer = require('nodemailer');
const config = require('../config');

const smtpConfigured = Boolean(config.smtp.email && config.smtp.appPassword);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.smtp.email, pass: config.smtp.appPassword },
    })
  : null;

// Escape user-supplied text before putting it in email HTML.
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Sent emails are recorded here in tests so they can be asserted on.
const sentEmails = [];

exports.escapeHtml = escapeHtml;
exports.sentEmails = sentEmails;

exports.sendEmail = async ({ to, subject, text, html }) => {
  if (config.isTest) {
    sentEmails.push({ to, subject, text, html });
    return true;
  }

  if (!transporter) {
    if (config.isProduction) {
      console.error(`[mail] SMTP is not configured; could not send "${subject}" to ${to}.`);
      return false;
    }
    // Local development without SMTP: print the email so links can be copied from the terminal.
    console.warn('[mail] SMTP_EMAIL / SMTP_APP_PASSWORD not set. Printing email instead of sending it.');
    console.log(`\n--- EMAIL ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-------------\n`);
    return true;
  }

  try {
    await transporter.sendMail({ from: `"NoteVault" <${config.smtp.email}>`, to, subject, text, html });
    return true;
  } catch (error) {
    console.error('[mail] Delivery error:', error.message);
    return false;
  }
};
