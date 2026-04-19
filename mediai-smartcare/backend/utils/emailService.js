const axios = require("axios");

const EMAIL_PROVIDER = String(
  process.env.EMAIL_PROVIDER || "brevo",
).toLowerCase();
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "MediAI SmartCare";

const emailConfigured = () =>
  Boolean(process.env.EMAIL_FROM) &&
  ((EMAIL_PROVIDER === "brevo" && Boolean(process.env.BREVO_API_KEY)) ||
    (EMAIL_PROVIDER === "resend" && Boolean(process.env.RESEND_API_KEY)));

const buildEmailHtml = ({ title, message, details = [] }) => {
  const detailRows = details
    .filter((detail) => detail?.label && detail?.value)
    .map(
      (detail) => `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#12343a;">${detail.label}</td>
          <td style="padding:8px 12px;color:#334155;">${detail.value}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#f4f7f7;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #d9e4e4;overflow:hidden;">
        <div style="background:#0e747c;color:#ffffff;padding:20px 24px;">
          <h1 style="margin:0;font-size:22px;">${title}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">${message}</p>
          ${
            detailRows
              ? `<table style="width:100%;border-collapse:collapse;background:#f8fbfb;border-radius:12px;overflow:hidden;">${detailRows}</table>`
              : ""
          }
          <p style="margin:20px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
            This message was sent by MediAI SmartCare. Avoid sharing sensitive health details over unsecured channels.
          </p>
        </div>
      </div>
    </div>
  `;
};

const buildEmailText = ({ title, message, details = [] }) => {
  const detailText = details
    .filter((detail) => detail?.label && detail?.value)
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join("\n");

  return [title, "", message, detailText ? `\n${detailText}` : ""]
    .filter(Boolean)
    .join("\n");
};

const sendViaResend = async ({ to, subject, html, text }) => {
  const response = await axios.post(
    "https://api.resend.com/emails",
    {
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  return {
    provider: "resend",
    externalId: response.data?.id || null,
  };
};

const sendViaBrevo = async ({ to, subject, html, text }) => {
  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((email) => ({ email }));

  const response = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        email: process.env.EMAIL_FROM,
        name: EMAIL_FROM_NAME,
      },
      to: recipients,
      subject,
      htmlContent: html,
      textContent: text,
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 15000,
    },
  );

  return {
    provider: "brevo",
    externalId:
      response.data?.messageId ||
      response.data?.message_id ||
      response.data?.requestId ||
      null,
  };
};

const sendEmail = async ({ to, subject, title, message, details = [] }) => {
  if (!to) {
    return {
      status: "skipped",
      reason: "Missing recipient email address",
    };
  }

  if (!emailConfigured()) {
    return {
      status: "skipped",
      reason:
        "Email delivery is not configured. Set EMAIL_FROM and provider credentials.",
    };
  }

  const html = buildEmailHtml({ title, message, details });
  const text = buildEmailText({ title, message, details });

  if (EMAIL_PROVIDER === "brevo") {
    const delivery = await sendViaBrevo({ to, subject, html, text });
    return {
      status: "sent",
      provider: delivery.provider,
      externalId: delivery.externalId,
    };
  }

  if (EMAIL_PROVIDER === "resend") {
    const delivery = await sendViaResend({ to, subject, html, text });
    return {
      status: "sent",
      provider: delivery.provider,
      externalId: delivery.externalId,
    };
  }

  return {
    status: "skipped",
    reason: `Unsupported EMAIL_PROVIDER: ${EMAIL_PROVIDER}`,
  };
};

module.exports = {
  sendEmail,
  emailConfigured,
};
