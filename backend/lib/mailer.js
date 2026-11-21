import { ENV } from "../env.js";

// Sends an email through Resend when configured. Otherwise the message is
// printed to the server console so password reset still works in development.
export const sendMail = async ({ to, subject, text }) => {
  if (!ENV.RESEND_API_KEY || !ENV.MAIL_FROM) {
    console.log(`[mail not configured] To: ${to}\n${subject}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: ENV.MAIL_FROM, to, subject, text }),
  });

  if (!response.ok) {
    throw new Error(`Email provider responded with ${response.status}`);
  }
};
