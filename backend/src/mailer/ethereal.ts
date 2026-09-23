import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;
let account: { user: string; pass: string } | null = null;

export async function initMailer() {
  if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
    account = { user: process.env.ETHEREAL_USER, pass: process.env.ETHEREAL_PASS };
  } else {
    account = await nodemailer.createTestAccount();
    console.log("ethereal account:", account.user);
    console.log("set ETHEREAL_USER / ETHEREAL_PASS in .env to reuse this account");
  }

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  body: string;
  from: string;
}

export async function sendMail(opts: SendMailOptions) {
  if (!transporter) throw new Error("mailer not initialised");

  const info = await transporter.sendMail({
    from: `"ReachInbox" <${opts.from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: `<div style="font-family:sans-serif">${opts.body.split("\n").join("<br/>")}</div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || "";

  return { messageId: info.messageId, previewUrl };
}
