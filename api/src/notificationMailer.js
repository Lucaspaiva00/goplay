const nodemailer = require("nodemailer");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailConfig() {
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.EMAIL_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    const err = new Error("EMAIL_USER ou EMAIL_PASS não configurados.");
    err.code = "EMAIL_CONFIG_MISSING";
    throw err;
  }

  return { user, pass };
}

function createMailTransport(port = 465) {
  const { user, pass } = getEmailConfig();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

async function sendMailWithFallback(mailOptions) {
  try {
    return await createMailTransport(465).sendMail(mailOptions);
  } catch (error) {
    const connectionErrors = new Set(["ETIMEDOUT", "ECONNECTION", "ECONNREFUSED", "ESOCKET"]);
    if (!connectionErrors.has(error?.code)) throw error;
    return createMailTransport(587).sendMail(mailOptions);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function frontendPagesBase() {
  let base = String(process.env.FRONTEND_URL || "https://ligagoplay.com.br").trim().replace(/\/+$/, "");
  if (!/\/paginas$/i.test(base)) base += "/paginas";
  return base;
}

function buildNotificationLink(url) {
  const raw = String(url || "").trim();
  if (!raw) return frontendPagesBase().replace(/\/paginas$/i, "");

  if (/^https?:\/\//i.test(raw)) return raw;

  const clean = raw.replace(/^\/+/, "");
  if (/^paginas\//i.test(clean)) {
    const root = frontendPagesBase().replace(/\/paginas$/i, "");
    return `${root}/${clean}`;
  }

  return `${frontendPagesBase()}/${clean}`;
}

async function sendNotificationEmail({ to, nome, titulo, mensagem, url }) {
  const destinatario = String(to || "").trim().toLowerCase();
  if (!EMAIL_RE.test(destinatario)) {
    const err = new Error("Destinatário sem e-mail válido.");
    err.code = "INVALID_RECIPIENT";
    throw err;
  }

  const { user } = getEmailConfig();
  const link = buildNotificationLink(url);
  const safeNome = escapeHtml(nome || "usuário");
  const safeTitulo = escapeHtml(titulo || "Nova notificação");
  const safeMensagem = escapeHtml(mensagem || "");
  const safeLink = escapeHtml(link);

  return sendMailWithFallback({
    from: `"GoPlay" <${user}>`,
    to: destinatario,
    subject: `GoPlay • ${String(titulo || "Nova notificação").slice(0, 120)}`,
    text: [
      `Olá, ${nome || "usuário"}.`,
      "",
      String(titulo || "Nova notificação"),
      String(mensagem || ""),
      "",
      `Acesse o GoPlay: ${link}`,
    ].join("\n"),
    html: `
      <div style="background:#f4f7fb;padding:28px 12px;font-family:Arial,sans-serif;color:#172033">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3eaf2">
          <div style="background:#052845;padding:22px 26px;color:#ffffff">
            <div style="font-size:22px;font-weight:800">GoPlay</div>
            <div style="font-size:12px;opacity:.8;margin-top:3px">Nova notificação</div>
          </div>
          <div style="padding:26px">
            <p style="margin:0 0 14px">Olá, <strong>${safeNome}</strong>.</p>
            <h2 style="font-size:20px;color:#052845;margin:0 0 10px">${safeTitulo}</h2>
            <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 22px">${safeMensagem}</p>
            <a href="${safeLink}" style="display:inline-block;background:#0b5f9e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
              Abrir no GoPlay
            </a>
            <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:24px 0 0">
              Você recebeu este e-mail porque existe uma nova notificação vinculada à sua conta GoPlay.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

module.exports = {
  EMAIL_RE,
  getEmailConfig,
  createMailTransport,
  sendMailWithFallback,
  buildNotificationLink,
  sendNotificationEmail,
};
