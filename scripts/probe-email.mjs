/**
 * Talks to the SMTP provider directly and prints the whole conversation.
 *
 * WHY THIS EXISTS. Supabase reports every mail failure as "Error sending magic
 * link email", whatever went wrong — an unverified domain, a bad password, a
 * blocked port and a malformed sender all produce that one sentence, and its
 * auth logs are not retained on the free plan. So the only way to find out what
 * the provider actually said is to ask it.
 *
 * It earned its place on first use: the message was
 *   550 The send.theopinionhq.com domain is not verified
 * which no amount of reading the Supabase config would have revealed, and which
 * points at a dashboard button rather than at anything in this repository.
 *
 *   node --env-file-if-exists=.env.local scripts/probe-email.mjs you@example.com
 *   npm run auth:probe-email -- you@example.com
 *
 * IT SENDS A REAL EMAIL when the provider accepts it. Use your own address.
 * Runs the same envelope Supabase would, so an accept here means the transport
 * is not the problem.
 */

import net from "node:net";
import tls from "node:tls";

const HOST = process.env.SMTP_HOST || "smtp.resend.com";
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || "resend";
const PASS = process.env.SMTP_PASSWORD;
const FROM = process.env.SMTP_SENDER_EMAIL;
const NAME = process.env.SMTP_SENDER_NAME || "OpinionHQ";
const RCPT = process.argv[2];

if (!PASS || !FROM || !RCPT) {
  console.error("usage: smtp-probe.mjs <recipient>   (needs SMTP_PASSWORD, SMTP_SENDER_EMAIL)");
  process.exit(1);
}

const body =
  [
    `From: ${NAME} <${FROM}>`,
    `To: <${RCPT}>`,
    "Subject: OpinionHQ SMTP diagnostic",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Diagnostic sent while debugging why Supabase reported",
    '"Error sending magic link email".',
    "",
    "If this arrived, Resend delivery works and the fault is on the",
    "Supabase side rather than the sending domain.",
    "",
    ".",
  ].join("\r\n") + "\r\n";

const script = [
  "EHLO opinionhq.local",
  "STARTTLS",
  "EHLO opinionhq.local",
  "AUTH LOGIN",
  Buffer.from(USER).toString("base64"),
  Buffer.from(PASS).toString("base64"),
  `MAIL FROM:<${FROM}>`,
  `RCPT TO:<${RCPT}>`,
  "DATA",
  body,
  "QUIT",
];

let i = 0;
let sock = net.createConnection(PORT, HOST);
const log = [];
let rejected = false;

const write = (s) => {
  const first = s.split("\r\n")[0];
  log.push("> " + (s.length > 60 ? first + " …" : first));
  sock.write(s.endsWith("\r\n") ? s : s + "\r\n");
};

const finish = () => {
  console.log(log.join("\n"));
  console.log(rejected ? "\nRESULT: rejected — see the line above" : "\nRESULT: accepted for delivery");
  process.exit(rejected ? 1 : 0);
};

const onData = (buf) => {
  for (const raw of buf.toString().trim().split("\n")) {
    const line = raw.trim();
    if (/^\d\d\d-/.test(line)) continue;
    log.push("< " + line);

    if (script[i] === "STARTTLS" && line.startsWith("220") && i > 0) {
      const plain = sock;
      plain.removeAllListeners("data");
      i += 1;
      sock = tls.connect({ socket: plain, servername: HOST }, () => {
        sock.on("data", onData);
        write(script[i]);
      });
      sock.on("error", (e) => {
        console.error(e.message);
        process.exit(1);
      });
      return;
    }

    if (line.startsWith("2") || line.startsWith("3")) {
      i += 1;
      if (i < script.length) write(script[i]);
      else {
        sock.end();
        finish();
      }
    } else {
      rejected = true;
      log.push("!! REJECTED AT: " + (script[i] || "").split("\r\n")[0]);
      sock.end();
      finish();
      return;
    }
  }
};

sock.on("data", onData);
sock.on("error", (e) => {
  console.error("socket: " + e.message);
  process.exit(1);
});
setTimeout(() => {
  console.log(log.join("\n"));
  console.log("\nRESULT: timed out");
  process.exit(1);
}, 25000);
