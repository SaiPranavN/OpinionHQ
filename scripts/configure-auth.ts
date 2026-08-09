/**
 * The auth settings this app needs, applied to the linked project.
 *
 * WHY A SCRIPT AND NOT A DASHBOARD VISIT. Three of these four have to agree with
 * a constant in the code, and a setting that has to agree with code is a setting
 * that drifts. `mailer_otp_length` against `CODE_LENGTH` is the sharp one: six
 * boxes rendered for an eight-digit code rejects every submission for a reason
 * nothing on screen explains, and nobody looks at a dashboard field when the
 * error says "invalid token". Written down here, it is reviewable and repeatable.
 *
 *   npm run auth:configure          apply
 *   npm run auth:configure -- --dry show what would change and exit
 */

import { CODE_LENGTH } from "@/lib/auth/signup";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/signup";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_ID. See .env.example.");
  process.exit(1);
}

/**
 * The email that carries the code.
 *
 * `{{ .Token }}` is the six digits. The default template has only
 * `{{ .ConfirmationURL }}`, which is a magic link — and a magic link cannot be
 * typed into six boxes, so with the default template step two of sign-up has
 * nothing to enter and the flow simply stops.
 *
 * The link is kept underneath as a fallback, because somebody reading mail on a
 * phone would rather tap than transcribe. Both open the same session.
 *
 * Deliberately plain: an HTML email full of images and tracking pixels from an
 * address nobody recognises is what a phishing filter is built to catch.
 */
const OTP_EMAIL = `<h2>Your OpinionHQ code</h2>
<p>Enter this code to confirm your email address:</p>
<p style="font-size:28px;letter-spacing:8px;font-weight:700;margin:16px 0">{{ .Token }}</p>
<p>It expires in an hour. If you did not ask for it, you can ignore this email — nothing has been created.</p>
<hr>
<p style="font-size:13px;color:#666">Or <a href="{{ .ConfirmationURL }}">open this link</a> instead.</p>`;

/**
 * Custom SMTP, when credentials are present.
 *
 * Left out entirely when they are not, rather than sent as empty strings —
 * a half-configured sender is worse than the built-in one, because Supabase
 * stops falling back to it and every email fails instead of merely being
 * rate-limited.
 *
 * Enabling this is also what unlocks the email templates: a free-tier project
 * on the built-in sender cannot change them, which is why no six-digit code
 * reaches an inbox until this is set.
 */
const smtp = process.env.SMTP_PASSWORD
  ? {
      smtp_host: process.env.SMTP_HOST ?? "smtp.resend.com",
      // 587 with STARTTLS rather than 465 with implicit TLS: some hosts block
      // 465 outbound, and Supabase's sender negotiates the upgrade fine.
      //
      // A string, not a number. The Management API validates this field as text
      // and rejects the whole PATCH with "expected string, received number" —
      // which takes every unrelated setting in the request down with it.
      smtp_port: String(process.env.SMTP_PORT ?? 587),
      smtp_user: process.env.SMTP_USER ?? "resend",
      smtp_pass: process.env.SMTP_PASSWORD,
      smtp_sender_name: process.env.SMTP_SENDER_NAME ?? "OpinionHQ",
      smtp_admin_email: process.env.SMTP_SENDER_EMAIL,
      // Supabase drops to 30/hour when custom SMTP is switched on, to protect
      // a new sender's reputation. Raised to something a real sign-up rate can
      // live with, and still under Resend's free 100/day.
      rate_limit_email_sent: Number(process.env.SMTP_HOURLY_LIMIT ?? 60),
    }
  : {};

/**
 * Bot protection, and the half that actually enforces it.
 *
 * The widget in the browser only fetches a token. THIS is the part that checks
 * it: with `security_captcha_enabled` on, Supabase verifies every token
 * against this secret before it will create an account or issue a session. A
 * bot posting straight to the auth endpoint never runs the widget, so without
 * the server side there is no protection at all.
 *
 * Left alone entirely when the secret is absent. Enabling it without a secret
 * would reject every sign-up on the site, and doing that silently because an
 * environment variable was missing is worse than having no captcha.
 */
const captcha = process.env.TURNSTILE_SECRET_KEY
  ? {
      security_captcha_enabled: true,
      security_captcha_provider: "turnstile",
      security_captcha_secret: process.env.TURNSTILE_SECRET_KEY,
    }
  : {};

const desired: Record<string, unknown> = {
  ...smtp,
  ...captcha,
  // Has to equal CODE_LENGTH. See the note at the top.
  mailer_otp_length: CODE_LENGTH,
  mailer_templates_magic_link_content: OTP_EMAIL,
  mailer_templates_confirmation_content: OTP_EMAIL,
  // The app refuses anything shorter in `scorePassword`; the project agreeing
  // means the rule holds for anything that skips the form.
  password_min_length: MIN_PASSWORD_LENGTH,
  // An OAuth callback that is not on this list is refused by Supabase. The
  // production entry is here ahead of time so the first deploy is not the
  // moment it is discovered missing.
  uri_allow_list: [
    `${siteUrl}/auth/callback`,
    "http://localhost:3000/auth/callback",
    "https://theopinionhq.com/auth/callback",
    "https://www.theopinionhq.com/auth/callback",
  ]
    .filter((v, i, all) => all.indexOf(v) === i)
    .join(","),
};

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function main() {
  const current = (await (await fetch(api, { headers })).json()) as Record<string, unknown>;

  const changes = Object.entries(desired).filter(
    ([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value),
  );

  if (changes.length === 0) {
    console.log("Auth config already matches. Nothing to do.");
    return;
  }

  for (const [key, value] of changes) {
    const before = typeof current[key] === "string" ? `${String(current[key]).slice(0, 48)}…` : current[key];
    const after = typeof value === "string" && value.length > 48 ? `${value.slice(0, 48)}…` : value;
    console.log(`  ${key}\n    from ${JSON.stringify(before)}\n      to ${JSON.stringify(after)}`);
  }

  if (process.argv.includes("--dry")) {
    console.log(`\n${changes.length} change(s) would be applied. Re-run without --dry.`);
    return;
  }

  const patch = async (entries: [string, unknown][]) =>
    fetch(api, { method: "PATCH", headers, body: JSON.stringify(Object.fromEntries(entries)) });

  let response = await patch(changes);
  let applied = changes.length;
  let templatesRefused = false;

  /**
   * A free-tier project on the built-in email sender cannot change its
   * templates at all — the whole PATCH is rejected, including the fields that
   * had nothing to do with email.
   *
   * So the templates are dropped and the rest is retried, rather than leaving
   * four unrelated settings unapplied because of a plan limit. The refusal is
   * reported at the end, because it is the one that stops sign-up working: the
   * default template sends a link and no code, and a link cannot be typed into
   * six boxes.
   */
  if (!response.ok && (await response.clone().text()).includes("Email template")) {
    templatesRefused = true;
    const rest = changes.filter(([key]) => !key.startsWith("mailer_templates_"));
    applied = rest.length;
    response = rest.length ? await patch(rest) : response;
    if (!rest.length) response = new Response("{}", { status: 200 });
  }

  if (!response.ok) {
    console.error(`\nFailed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  console.log(`\nApplied ${applied} change(s) to ${ref}.`);

  if (templatesRefused) {
    console.log(
      "\nREFUSED: the email templates.\n" +
        "  Supabase will not let a free-tier project on the built-in sender change them.\n" +
        "  The default template carries a magic link and no {{ .Token }}, so no code is\n" +
        "  emailed and step two of sign-up has nothing to type. Configuring custom SMTP\n" +
        "  lifts the restriction — and fixes the few-emails-an-hour cap at the same time.",
    );
  }

  // Not set by this script — they need credentials it has no business holding.
  const manual: string[] = [];
  if (!current.external_google_enabled) {
    manual.push("Google is off. Enable it in Authentication → Sign In / Providers with a Google Cloud client ID and secret.");
  }
  if (!smtp.smtp_host && !current.smtp_host) {
    manual.push(
      "No SMTP. The built-in sender allows a couple of emails an hour AND blocks template\n" +
        "    changes, so no six-digit code is ever emailed. Set SMTP_PASSWORD and\n" +
        "    SMTP_SENDER_EMAIL in .env.local and re-run this. See docs/database.md.",
    );
  }
  if (smtp.smtp_host && templatesRefused) {
    manual.push("SMTP is set but templates were still refused — re-run this script once Supabase has registered the sender.");
  }
  if (manual.length) {
    console.log("\nStill needs a person:");
    for (const line of manual) console.log(`  - ${line}`);
  }
}

void main();
