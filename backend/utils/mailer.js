const nodemailer = require('nodemailer');
const config = require('../config');

const { host, port, secure, user, pass, from } = config.smtp;
const smtpConfigured = Boolean(user && pass && from);

const transporter = !smtpConfigured
  ? null
  : host
    ? nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
    : nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

// "NoteVault <noreply@example.com>" unless SMTP_FROM already includes a display name.
const fromHeader = from && from.includes('<') ? from : `"NoteVault" <${from}>`;

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
    console.warn('[mail] SMTP is not configured (see backend/.env.example). Printing email instead of sending it.');
    console.log(`\n--- EMAIL ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-------------\n`);
    return true;
  }

  try {
    await transporter.sendMail({ from: fromHeader, to, subject, text, html });
    return true;
  } catch (error) {
    console.error('[mail] Delivery error:', error.message);
    return false;
  }
};
