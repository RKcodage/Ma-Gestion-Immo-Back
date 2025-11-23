const nodemailer = require("nodemailer");

// Centralized mailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendMail(options) {
  return transporter.sendMail(options);
}

module.exports = { transporter, sendMail };

