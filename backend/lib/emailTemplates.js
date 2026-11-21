// Simple, compact HTML emails. Kept deliberately plain (table layout, inline
// styles, system fonts) so they render the same in Gmail, Outlook and Apple Mail.
const COLORS = {
  text: "#171717",
  muted: "#737373",
  border: "#e5e5e5",
  box: "#f5f5f5",
  button: "#171717",
};
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const APP_NAME = "AIWebBuilder";

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const layout = ({ preheader, bodyHtml, footer }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;font-family:${FONT};color:${COLORS.text};">
          <tr>
            <td style="padding:0 0 16px;font-size:16px;font-weight:700;color:${COLORS.text};">${APP_NAME}</td>
          </tr>
          <tr>
            <td style="padding:20px 0;border-top:1px solid ${COLORS.border};border-bottom:1px solid ${COLORS.border};font-size:14px;line-height:22px;color:${COLORS.text};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font-size:12px;line-height:18px;color:${COLORS.muted};">${footer}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const otpEmail = ({ name, otp }) => ({
  subject: `${otp} is your ${APP_NAME} verification code`,
  text: `Hi ${name},\n\nYour verification code is ${otp}\n\nIt expires in 10 minutes. If you didn't create an account, you can ignore this email.`,
  html: layout({
    preheader: `Your verification code is ${otp}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(name)}, use this code to verify your email:</p>
      <p style="margin:0 0 12px;padding:12px;background:${COLORS.box};border-radius:6px;text-align:center;font-size:28px;line-height:32px;font-weight:700;letter-spacing:6px;font-family:Consolas,Menlo,monospace;color:${COLORS.text};">${escapeHtml(otp)}</p>
      <p style="margin:0;color:${COLORS.muted};">Expires in 10 minutes.</p>`,
    footer: "Didn&rsquo;t sign up? You can ignore this email. Never share this code with anyone.",
  }),
});

export const resetPasswordEmail = ({ name, url }) => ({
  subject: `Reset your ${APP_NAME} password`,
  text: `Hi ${name},\n\nUse this link to choose a new password (valid for 1 hour):\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
  html: layout({
    preheader: "Choose a new password. The link expires in 1 hour.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(name)}, click below to choose a new password:</p>
      <p style="margin:0 0 12px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;background:${COLORS.button};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Reset password</a></p>
      <p style="margin:0;color:${COLORS.muted};">Link expires in 1 hour.</p>`,
    footer: "Didn&rsquo;t ask for this? You can ignore this email &mdash; your password won&rsquo;t change.",
  }),
});
