let nodemailer;

try {
  // Optional dependency: if not installed, email sending will be disabled.
  // This avoids crashing the server in environments without SMTP/email support.
  // eslint-disable-next-line global-require
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      (process.env.SELLER_EMAIL || process.env.MAIL_TO)
  );
}

async function sendNewOrderEmail({ pedido, items, total, cliente }) {
  if (!nodemailer) return;
  if (!hasSmtpConfig()) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const to = process.env.SELLER_EMAIL || process.env.MAIL_TO;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const lines = (items || []).map(
    (it) => `- ${it.nombre} x${it.cantidad} ($${Number(it.precio).toFixed(2)})`
  );

  const subject = `Nuevo pedido #${pedido?.id ?? ''} - Cheapshop`;
  const text = [
    `Se realizó un nuevo pedido en Cheapshop.`,
    '',
    `Pedido: #${pedido?.id ?? ''}`,
    `Total: $${Number(total || 0).toFixed(2)}`,
    '',
    `Cliente: ${cliente?.nombre || ''}`,
    `Cédula: ${cliente?.cedula || ''}`,
    `Teléfono: ${cliente?.telefono || ''}`,
    `Email: ${cliente?.email || ''}`,
    '',
    'Items:',
    ...lines
  ].join('\n');

  await transporter.sendMail({
    from,
    to,
    subject,
    text
  });
}

module.exports = {
  sendNewOrderEmail
};
