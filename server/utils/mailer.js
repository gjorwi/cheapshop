let nodemailer;
let fixedMailerConfig;
let nodemailerLoadError;

try {
  // Optional dependency: if not installed, email sending will be disabled.
  // This avoids crashing the server in environments without SMTP/email support.
  // eslint-disable-next-line global-require
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
  nodemailerLoadError = e;
}

try {
  // Optional local config (should be gitignored): server/config/mailer.js
  // eslint-disable-next-line global-require, import/no-unresolved
  fixedMailerConfig = require('../config/mailer');
} catch (e) {
  fixedMailerConfig = null;
}

function hasSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST || fixedMailerConfig?.smtp?.host;
  const smtpPort = process.env.SMTP_PORT || fixedMailerConfig?.smtp?.port;
  const smtpUser = process.env.SMTP_USER || fixedMailerConfig?.smtp?.auth?.user;
  const smtpPass = process.env.SMTP_PASS || fixedMailerConfig?.smtp?.auth?.pass;
  const to =
    process.env.SELLER_EMAIL ||
    process.env.MAIL_TO ||
    fixedMailerConfig?.mail?.to;

  return Boolean(smtpHost && smtpPort && smtpUser && smtpPass && to);
}

async function sendNewOrderEmail({ pedido, items, total, cliente }) {
  const debugMailer = String(process.env.DEBUG_MAILER || '').toLowerCase() === 'true';

  if (!nodemailer) {
    if (debugMailer && nodemailerLoadError) {
      console.warn('[mailer] Error cargando nodemailer:', nodemailerLoadError);
    }
    if (debugMailer) console.warn('[mailer] nodemailer no disponible; se omite envio de email');
    return;
  }
  if (!hasSmtpConfig()) {
    if (debugMailer) console.warn('[mailer] Config SMTP incompleta; se omite envio de email');
    return;
  }

  const smtpHost = process.env.SMTP_HOST || fixedMailerConfig?.smtp?.host;
  const smtpPort = Number(process.env.SMTP_PORT || fixedMailerConfig?.smtp?.port);
  const smtpSecureEnv = String(process.env.SMTP_SECURE || '').toLowerCase();
  const smtpSecure =
    smtpSecureEnv
      ? smtpSecureEnv === 'true'
      : Boolean(fixedMailerConfig?.smtp?.secure);
  const smtpUser = process.env.SMTP_USER || fixedMailerConfig?.smtp?.auth?.user;
  const smtpPass = process.env.SMTP_PASS || fixedMailerConfig?.smtp?.auth?.pass;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const to =
    process.env.SELLER_EMAIL ||
    process.env.MAIL_TO ||
    fixedMailerConfig?.mail?.to;
  const from =
    process.env.MAIL_FROM ||
    fixedMailerConfig?.mail?.from ||
    smtpUser;

  if (debugMailer) {
    console.log('[mailer] Enviando email', {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      to,
      from,
      pedidoId: pedido?.id
    });
  }

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

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text
    });
    if (debugMailer) console.log('[mailer] Email enviado OK');
  } catch (e) {
    if (debugMailer) console.error('[mailer] Error enviando email:', e);
    throw e;
  }
}

module.exports = {
  sendNewOrderEmail
};
