const nodemailer = require('nodemailer');

// Ensure you set SMTP_EMAIL and SMTP_APP_PASSWORD in backend/.env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,       // e.g., 'your.gmail@gmail.com'
    pass: process.env.SMTP_APP_PASSWORD // e.g., 'abcd efgh ijkl mnop' (16 character App Password)
  }
});

exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    // If SMTP details aren't set up yet, gracefully log and skip to prevent app crashing
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_APP_PASSWORD) {
      console.warn('⚠️ SMTP_EMAIL or SMTP_APP_PASSWORD not set in .env. Mocking email delivery instead.');
      console.log(`\n--- MOCK EMAIL --- \nTo: ${to}\nSubject: ${subject}\nText: ${text}\n------------------\n`);
      return true;
    }

    const info = await transporter.sendMail({
      from: `"NoteVault" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      text,
      html
    });

    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email Delivery Error:', error);
    return false;
  }
};
