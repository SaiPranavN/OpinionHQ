/**
 * The rules behind creating an account.
 *
 * Pure, so every rule below can be tested without rendering a form — and kept
 * out of the components because a validation rule that only exists inside a
 * `useState` handler is a rule the server cannot reuse when this gets a real
 * backend. Each function here takes its inputs explicitly and returns a message
 * or nothing, which is the shape a route handler wants too.
 *
 * WHAT THE ORDER OF THE STEPS IS FOR. Name and address, then prove the address,
 * then set a password, then tell us about yourself. Verifying before the
 * password exists means a typo'd address fails before anybody has invested
 * anything in the account, and — the part that matters — it means no account
 * can exist against an address its owner never confirmed. On a product whose
 * entire claim is "one account, one vote", an unverified account is a vote
 * somebody manufactured.
 *
 * NONE OF IT IS REAL YET. There is no mail service, so the code is generated
 * in the browser and shown on screen; there is no captcha provider, so the
 * challenge is a placeholder. Both are labelled as such wherever they appear.
 * The shapes are what a real implementation would keep.
 */

/* ------------------------------------------------------------ email codes */

export const CODE_LENGTH = 6;

/** Seconds before a new code can be requested. */
export const RESEND_SECONDS = 30;

/**
 * Wrong codes allowed before the address has to be re-entered.
 *
 * Five, because a six-digit code has a million values and unlimited guesses
 * would make the verification decorative. Real implementations rate-limit
 * server-side; this is the same rule in the only place this build has.
 */
export const MAX_CODE_ATTEMPTS = 5;

/**
 * A six-digit code.
 *
 * `Math.random` is fine for a code that is printed on screen next to a note
 * saying it is simulated. A real one is generated server-side from a CSPRNG,
 * stored hashed with a short expiry, and never travels to the client — which is
 * the one thing this version cannot demonstrate and should not pretend to.
 */
export function newVerificationCode(): string {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * Whether filling the boxes should submit by itself.
 *
 * Only on the transition from incomplete to complete. Submitting whenever the
 * field happens to be full means that correcting a single mistyped digit —
 * where the field never stops being six long — spends an attempt per
 * keystroke, and five keystrokes of ordinary correction lock the account out
 * of its own verification. Found by walking the flow, not by reading it.
 */
export function shouldAutoSubmit(previous: string, next: string, length: number): boolean {
  return next.length === length && previous.length < length;
}

export type CodeVerdict =
  | { ok: true }
  | { ok: false; reason: "incomplete" | "mismatch" | "exhausted"; message: string };

export function checkCode(entered: string, expected: string, attempts: number): CodeVerdict {
  if (attempts >= MAX_CODE_ATTEMPTS) {
    return {
      ok: false,
      reason: "exhausted",
      message: "Too many attempts. Go back and request a new code.",
    };
  }
  if (entered.length < CODE_LENGTH) {
    return { ok: false, reason: "incomplete", message: `Enter all ${CODE_LENGTH} digits.` };
  }
  if (entered !== expected) {
    const left = MAX_CODE_ATTEMPTS - attempts - 1;
    return {
      ok: false,
      reason: "mismatch",
      message:
        left > 0
          ? `That code is not right. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
          : "That code is not right. Go back and request a new one.",
    };
  }
  return { ok: true };
}

/* --------------------------------------------------------------- password */

export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordScore {
  /** 0–4. Drives the meter; `ok` is what actually gates the button. */
  score: number;
  label: string;
  /** What is still missing, in the order worth fixing. Empty when accepted. */
  hints: string[];
  ok: boolean;
}

/**
 * How good a password is.
 *
 * Length first and weighted hardest, because it is the only property that
 * reliably resists an offline guessing attack — a ten-character passphrase
 * beats "P@ss1!" and every composition rule that says otherwise is teaching
 * people to write worse passwords. Character variety is a nudge, not a gate:
 * the only hard requirements are length and not being one of the handful of
 * strings everybody tries first.
 */
export function scorePassword(password: string): PasswordScore {
  const hints: string[] = [];
  const long = password.length >= MIN_PASSWORD_LENGTH;
  if (!long) hints.push(`At least ${MIN_PASSWORD_LENGTH} characters`);

  const common = COMMON_PASSWORDS.has(password.toLowerCase());
  if (common) hints.push("Too common — pick something less guessable");

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (long && !common && classes < 2) hints.push("Mix in a number, a capital or a symbol");

  const ok = long && !common;

  let score = 0;
  if (password.length >= 6) score = 1;
  if (long) score = 2;
  if (long && classes >= 2) score = 3;
  if (password.length >= 14 && classes >= 3) score = 4;
  if (common) score = Math.min(score, 1);

  return { score, label: STRENGTH_LABELS[score] ?? "Weak", hints, ok };
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

/**
 * A deliberately tiny list.
 *
 * Enough to reject the handful of strings that appear at the top of every
 * breach corpus. A real deployment checks against a proper breached-password
 * set — k-anonymity against Have I Been Pwned, or a bundled top-100k list —
 * which is a server's job, not a bundle's.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyuiop", "qwerty123", "letmein123", "iloveyou1", "admin1234", "welcome123",
  "opinionhq", "changeme123", "passw0rd123", "abcd123456",
]);

export function passwordsMatch(password: string, confirm: string): string | null {
  if (!confirm) return "Type your password a second time.";
  return password === confirm ? null : "The two passwords do not match.";
}

/* ---------------------------------------------------------------- details */

/**
 * The youngest an account holder can be.
 *
 * Thirteen is the floor most consumer products use and the one India's DPDP
 * Act pushes higher — verifiable parental consent is required under 18 there,
 * which a real deployment has to solve properly. This build states the rule and
 * checks the date; it does not pretend the check is verification.
 */
export const MIN_AGE = 13;

export function ageOn(dob: string, today: Date): number | null {
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}

/** Loose on shape, strict on nothing else — numbering plans differ by country. */
const MOBILE_RE = /^[+]?[0-9\s-]{7,18}$/;

export interface AccountDetailsDraft {
  dob?: string;
  mobile?: string;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
}

export type DetailErrors = Partial<Record<keyof AccountDetailsDraft, string>>;

/**
 * Every field is required, and the reason is not bureaucratic.
 *
 * Age, occupation and location are the only inputs to the cross-tabs — the
 * "how did 17–20s split against over-31s" and "how did Karnataka split against
 * Kerala" rows that are most of what a topic dashboard is for. Optional fields
 * produce a chart drawn from whoever felt like answering, which is a worse
 * failure than no chart: it looks like a measurement and is a self-selected
 * sample.
 *
 * `mobile` is the exception worth noticing — nothing on the product charts it.
 * It is collected for account recovery, and it is the one field that could be
 * dropped without losing a single graph.
 */
export function validateDetails(
  details: AccountDetailsDraft,
  today: Date = new Date(),
): DetailErrors {
  const errors: DetailErrors = {};

  if (!details.dob) {
    errors.dob = "Needed for the age breakdowns.";
  } else {
    const age = ageOn(details.dob, today);
    if (age === null) errors.dob = "That is not a date we can read.";
    else if (age < 0) errors.dob = "That date is in the future.";
    else if (age < MIN_AGE) errors.dob = `You have to be at least ${MIN_AGE} to hold an account.`;
    else if (age > 120) errors.dob = "Check the year — that reads as over 120.";
  }

  if (!details.mobile?.trim()) errors.mobile = "Used to recover your account.";
  else if (!MOBILE_RE.test(details.mobile.trim())) errors.mobile = "That does not look like a phone number.";

  if (!details.occupation) errors.occupation = "Needed for the occupation breakdowns.";
  if (!details.country) errors.country = "Needed for the regional breakdowns.";
  if (!details.state?.trim()) errors.state = "Needed for the regional breakdowns.";
  if (!details.city?.trim()) errors.city = "Needed for the regional breakdowns.";

  return errors;
}

export function hasErrors(errors: DetailErrors): boolean {
  return Object.keys(errors).length > 0;
}

/* ------------------------------------------------------------------ steps */

export type SignupStep = "account" | "verify" | "password" | "details";

export const SIGNUP_STEPS: readonly { id: SignupStep; label: string }[] = [
  { id: "account", label: "Your details" },
  { id: "verify", label: "Verify email" },
  { id: "password", label: "Password" },
  { id: "details", label: "About you" },
] as const;

/**
 * Where a step sits, 1-based, for "Step 2 of 4".
 *
 * Google skips two of them — an OAuth address arrives already verified and
 * there is no password to set — so the count it shows is its own, shorter one
 * rather than a four-step bar with two crossed out.
 */
export function stepPosition(step: SignupStep, viaGoogle: boolean): { index: number; total: number } {
  const flow: SignupStep[] = viaGoogle ? ["account", "details"] : ["account", "verify", "password", "details"];
  return { index: Math.max(flow.indexOf(step), 0) + 1, total: flow.length };
}
