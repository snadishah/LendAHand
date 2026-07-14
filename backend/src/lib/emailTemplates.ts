// Plain, self-contained HTML emails (inline styles for client compatibility).
// The visual design is intentionally simple here; it will be aligned with the
// Phase 4 black-and-white brand refresh later.

export interface EmailContent {
  type: string;
  subject: string;
  html: string;
  text: string;
  essential: boolean;
}

interface WrapOptions {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  unsubscribeUrl?: string;
}

function wrap({ heading, bodyHtml, cta, unsubscribeUrl }: WrapOptions): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #eee;font-size:20px;font-weight:800;">🤝 LendAHand</td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 12px;font-size:20px;">${heading}</h1>
            <div style="font-size:15px;line-height:1.6;color:#333;">${bodyHtml}</div>
            ${
              cta
                ? `<div style="margin:24px 0 8px;"><a href="${cta.url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:8px;">${cta.label}</a></div>`
                : ""
            }
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #eee;font-size:12px;color:#999;">
            You're receiving this because you have a LendAHand account.
            ${unsubscribeUrl ? ` <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe from these emails</a>.` : ""}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const firstName = (name: string) => name.split(" ")[0];

export function welcomeEmail(name: string, userType: "POSTER" | "HELPER", appUrl: string): EmailContent {
  const poster = userType === "POSTER";
  const bodyHtml = poster
    ? `Welcome to LendAHand! You're all set to <strong>post tasks</strong> and hire helpers for whatever you need done. Post your first task, review the bids, and pick the best helper — payment stays safely in escrow until the job's complete.`
    : `Welcome to LendAHand! You're all set to <strong>find work and earn</strong>. Browse open tasks near you, place a bid, and get paid straight to your in-app wallet when the poster confirms the job.`;
  return {
    type: "WELCOME",
    subject: poster ? "Welcome to LendAHand — post your first task" : "Welcome to LendAHand — start earning",
    html: wrap({
      heading: `Welcome, ${firstName(name)}! 👋`,
      bodyHtml,
      cta: { label: poster ? "Post a Task" : "Browse Tasks", url: `${appUrl}/${poster ? "tasks/new" : "tasks"}` },
    }),
    text: `Welcome to LendAHand, ${firstName(name)}! Get started at ${appUrl}`,
    essential: true,
  };
}

export function verifyEmail(name: string, link: string): EmailContent {
  return {
    type: "VERIFY_EMAIL",
    subject: "Verify your email for LendAHand",
    html: wrap({
      heading: "Confirm your email",
      bodyHtml: `Hi ${firstName(name)}, please confirm this is your email address so we can keep your account secure. This link expires in 24 hours.`,
      cta: { label: "Verify Email", url: link },
    }),
    text: `Verify your LendAHand email: ${link}`,
    essential: true,
  };
}

export function passwordResetEmail(name: string, link: string): EmailContent {
  return {
    type: "PASSWORD_RESET",
    subject: "Reset your LendAHand password",
    html: wrap({
      heading: "Reset your password",
      bodyHtml: `Hi ${firstName(name)}, we received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
      cta: { label: "Reset Password", url: link },
    }),
    text: `Reset your LendAHand password: ${link}`,
    essential: true,
  };
}

export function bidAcceptedEmail(name: string, taskTitle: string, amount: number, link: string): EmailContent {
  return {
    type: "BID_ACCEPTED",
    subject: `Your bid on "${taskTitle}" was accepted 🎉`,
    html: wrap({
      heading: "Your bid was accepted!",
      bodyHtml: `Hi ${firstName(name)}, your bid of <strong>Rs. ${amount}</strong> on “${taskTitle}” was accepted. Time to get started — mark it as done when you finish and the poster will confirm to release your payment.`,
      cta: { label: "View Task", url: link },
    }),
    text: `Your bid on "${taskTitle}" was accepted. View it: ${link}`,
    essential: true,
  };
}

export function workSubmittedEmail(name: string, taskTitle: string, link: string): EmailContent {
  return {
    type: "WORK_SUBMITTED",
    subject: `Work submitted on "${taskTitle}" — please confirm`,
    html: wrap({
      heading: "Work marked as done",
      bodyHtml: `Hi ${firstName(name)}, the helper marked “${taskTitle}” as done. Please review it and confirm to release the payment. If you don't confirm within 3 days, it will be released automatically.`,
      cta: { label: "Review & Confirm", url: link },
    }),
    text: `The helper submitted work on "${taskTitle}". Review and confirm: ${link}`,
    essential: true,
  };
}

export function paymentReleasedEmail(name: string, taskTitle: string, amount: number, auto: boolean): EmailContent {
  return {
    type: "PAYMENT_RELEASED",
    subject: `You've been paid Rs. ${amount} 💵`,
    html: wrap({
      heading: "Payment released",
      bodyHtml: auto
        ? `Hi ${firstName(name)}, Rs. <strong>${amount}</strong> for “${taskTitle}” has been auto-released to your wallet (the poster didn't confirm in time).`
        : `Hi ${firstName(name)}, Rs. <strong>${amount}</strong> for completing “${taskTitle}” has been released to your wallet. Nice work!`,
    }),
    text: `You've been paid Rs. ${amount} for "${taskTitle}".`,
    essential: true,
  };
}

export function disputeOpenedEmail(name: string, taskTitle: string, link: string): EmailContent {
  return {
    type: "DISPUTE_OPENED",
    subject: `A dispute was opened on "${taskTitle}"`,
    html: wrap({
      heading: "A dispute was opened",
      bodyHtml: `Hi ${firstName(name)}, a dispute was opened on “${taskTitle}”. The task is frozen and our team will review it, then release or refund the payment.`,
      cta: { label: "View Task", url: link },
    }),
    text: `A dispute was opened on "${taskTitle}". View it: ${link}`,
    essential: true,
  };
}

export function disputeResolvedEmail(name: string, taskTitle: string, released: boolean): EmailContent {
  return {
    type: "DISPUTE_RESOLVED",
    subject: `The dispute on "${taskTitle}" was resolved`,
    html: wrap({
      heading: "Dispute resolved",
      bodyHtml: `Hi ${firstName(name)}, the dispute on “${taskTitle}” has been resolved: ${
        released ? "the payment was released to the helper." : "the poster was refunded."
      }`,
    }),
    text: `The dispute on "${taskTitle}" was resolved.`,
    essential: true,
  };
}

export function reviewRequestEmail(name: string, taskTitle: string, link: string, unsubscribeUrl: string): EmailContent {
  return {
    type: "REVIEW_REQUEST",
    subject: `How did "${taskTitle}" go? Leave a review`,
    html: wrap({
      heading: "How did it go?",
      bodyHtml: `Hi ${firstName(name)}, “${taskTitle}” is complete. Leaving a quick review helps build trust in the community and takes less than a minute.`,
      cta: { label: "Leave a Review", url: link },
      unsubscribeUrl,
    }),
    text: `Leave a review for "${taskTitle}": ${link}`,
    essential: false,
  };
}
