const nodemailer = require('nodemailer');

/*
 * Netlify Function: send
 *
 * This function sends HTML email through an SMTP server configured via
 * environment variables. It accepts a JSON payload containing:
 *   - to: the recipient email address (required)
 *   - subject: the email subject line (required)
 *   - html: the HTML body of the email (required)
 *   - text: an optional plain‑text version of the email body
 *
 * Required environment variables:
 *   SMTP_HOST    – hostname of your SMTP server (e.g. mail.privateemail.com)
 *   SMTP_PORT    – port number (e.g. 465 for SSL, 587 for TLS)
 *   SMTP_USER    – username to authenticate with the SMTP server
 *   SMTP_PASS    – password or app token for the SMTP user
 *   DEFAULT_FROM – default From address (optional; falls back to SMTP_USER)
 */

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { to, subject, html, text } = JSON.parse(event.body || '{}');
    // Basic validation
    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: to, subject and html are required.',
        }),
      };
    }

    // Configure nodemailer transport using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, // true for port 465 (SSL)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.DEFAULT_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      // include plain text if provided
      ...(text ? { text } : {}),
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', details: String(err) }),
    };
  }
};
