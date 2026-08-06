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

const desired: Record<string, unknown> = {
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
  if (!current.smtp_host) {
    manual.push("No SMTP. The built-in sender allows only a few emails an hour and is not for production.");
  }
  if (manual.length) {
    console.log("\nStill needs a person:");
    for (const line of manual) console.log(`  - ${line}`);
  }
}

void main();
