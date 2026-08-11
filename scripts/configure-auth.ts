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
  /**
   * Where Supabase sends anybody it has nothing better to send.
   *
   * It is the fallback for every link in an auth email and the default landing
   * spot after a callback, so leaving it on `http://localhost:3000` in
   * production means a visitor who clicks a recovery link ends up pointed at
   * their own machine. It was not managed here at all — it had to be changed by
   * hand in the dashboard, which is the kind of step that gets remembered the
   * day after launch.
   *
   * Driven by NEXT_PUBLIC_SITE_URL, so cutover is: set it in the environment,
   * run this, and the project agrees with the deployment.
   */
  site_url: siteUrl,
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

/**
 * Fields whose values must never be printed.
 *
 * THIS WAS NOT HERE, AND IT COST A KEY. The diff below truncated long strings
 * to 48 characters purely so the output stayed readable — which is longer than
 * a Resend API key and longer than a Turnstile secret, so both were printed in
 * full every time somebody ran `--dry` to see what would change. The one
 * command whose entire job is to show you your own secrets moving around is the
 * last place that should echo them.
 *
 * Matched on the key name rather than by sniffing the value, so a secret added
 * later is covered by naming it conventionally rather than by remembering to
 * come back here.
 */
const SECRET_KEY_PATTERN = /pass|secret|token|key/i;

/** What is safe to show for one field: its shape, never its value. */
function preview(key: string, value: unknown): unknown {
  if (SECRET_KEY_PATTERN.test(key)) {
    if (value === null || value === undefined) return null;
    const text = String(value);
    // Enough to tell "changed" from "unchanged" and to spot an empty value,
    // without being enough to use.
    return `set (${text.length} chars, ends …${text.slice(-4)})`;
  }
  const text = typeof value === "string" ? value : null;
  return text && text.length > 48 ? `${text.slice(0, 48)}…` : value;
}

/**
 * Re-reads the project and checks the four things sign-up cannot live without.
 *
 * WRITTEN AFTER A SILENT REVERT. Custom SMTP came back as null, which drops the
 * project onto Supabase's built-in sender — and that sender is not allowed
 * custom email templates, so they reverted to the stock ones at the same time.
 * The stock template carries `{{ .ConfirmationURL }}` and no `{{ .Token }}`:
 * the email becomes a magic link, no six-digit code is ever sent, and step two
 * of sign-up has nothing to type into it. Nothing errored. The first anybody
 * knew was "the OTP has stopped working".
 *
 * The likeliest cause is the Supabase dashboard rather than this script, which
 * only ever PATCHes keys whose values differ. Saving Authentication → Settings
 * there submits the whole form, and the SMTP password field renders empty
 * because it is write-only — so a save made for an unrelated reason clears it.
 *
 * Either way the answer is the same: assert it afterwards instead of assuming,
 * so a revert is caught by the next run of this command rather than by a person
 * failing to sign in.
 */
async function checkSignUpStillWorks() {
  const live = (await (await fetch(api, { headers })).json()) as Record<string, unknown>;
  const template = String(live.mailer_templates_magic_link_content ?? "");

  const checks: [string, boolean, string][] = [
    [
      "custom SMTP is configured",
      Boolean(live.smtp_host),
      "Without it Supabase uses the built-in sender, which caps at a couple of emails an hour and refuses custom templates.",
    ],
    [
      "the sign-in email carries a code",
      template.includes("{{ .Token }}"),
      "The template has reverted to the stock one, which sends a link. A link cannot be typed into six boxes.",
    ],
    [
      "the code is the length the form expects",
      live.mailer_otp_length === CODE_LENGTH,
      `The form renders ${CODE_LENGTH} boxes; the project is issuing ${String(live.mailer_otp_length)} digits.`,
    ],
    [
      "captcha has a secret if it is enabled",
      !live.security_captcha_enabled || Boolean(live.security_captcha_secret),
      "Captcha is on with no secret, so every sign-up on the site will be refused.",
    ],
  ];

  const failed = checks.filter(([, ok]) => !ok);
  for (const [what, ok] of checks) console.log(`  ${ok ? "ok  " : "BROKEN"} ${what}`);

  if (failed.length > 0) {
    console.error("\nSign-up is broken:");
    for (const [what, , why] of failed) console.error(`  - ${what}\n      ${why}`);
    process.exit(1);
  }
}

async function main() {
  const current = (await (await fetch(api, { headers })).json()) as Record<string, unknown>;

  const changes = Object.entries(desired).filter(
    ([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value),
  );

  if (changes.length === 0) {
    console.log("Auth config already matches. Nothing to do.");
    await checkSignUpStillWorks();
    return;
  }

  for (const [key, value] of changes) {
    console.log(
      `  ${key}\n    from ${JSON.stringify(preview(key, current[key]))}\n      to ${JSON.stringify(preview(key, value))}`,
    );
  }

  if (process.argv.includes("--dry")) {
    console.log(`\n${changes.length} change(s) would be applied. Re-run without --dry.`);
    return;
  }

  const patch = async (entries: [string, unknown][]) =>
    fetch(api, { method: "PATCH", headers, body: JSON.stringify(Object.fromEntries(entries)) });

  /**
   * TWO PATCHES, AND THE ORDER IS THE WHOLE POINT.
   *
   * Supabase decides whether a project may set custom email templates from
   * whether it has custom SMTP — and it evaluates that against the state
   * BEFORE the request, not after. Sending SMTP and templates together
   * therefore fails in the worst possible way: the response is 200, the SMTP
   * fields land, and the templates are silently discarded. Nothing errors.
   *
   * That is what broke sign-up here. The project fell back to the built-in
   * sender at some point; every subsequent run of this script sent SMTP and
   * templates in one request, got a 200, and left the stock templates in
   * place — which carry `{{ .ConfirmationURL }}` and no `{{ .Token }}`, so the
   * email was a magic link and the six-digit code never existed. Re-running the
   * command looked like it worked, every time.
   *
   * So SMTP goes first and alone. Once it has landed, the templates are
   * permitted and the second request sticks. Verified against the live project:
   * combined, the templates are dropped; split, both persist.
   */
  const isSmtp = ([key]: [string, unknown]) =>
    key.startsWith("smtp_") || key === "rate_limit_email_sent";

  const phases: [string, [string, unknown][]][] = [
    ["sender", changes.filter(isSmtp)],
    ["everything else", changes.filter((entry) => !isSmtp(entry))],
  ];

  let applied = 0;
  let templatesRefused = false;

  for (const [label, entries] of phases) {
    if (entries.length === 0) continue;
    let response = await patch(entries);

    /**
     * A project with no custom SMTP at all cannot change its templates, and
     * says so with an error rather than a silent 200. Dropping them and
     * retrying the rest beats leaving unrelated settings unapplied over a
     * restriction that only touches two fields.
     */
    if (!response.ok && (await response.clone().text()).includes("Email template")) {
      templatesRefused = true;
      const rest = entries.filter(([key]) => !key.startsWith("mailer_templates_"));
      response = rest.length ? await patch(rest) : new Response("{}", { status: 200 });
      applied += rest.length;
    } else {
      applied += entries.length;
    }

    if (!response.ok) {
      console.error(`\nFailed applying ${label}: ${response.status} ${await response.text()}`);
      process.exit(1);
    }
  }

  console.log(`\nApplied ${applied} change(s) to ${ref}.`);

  await checkSignUpStillWorks();

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
