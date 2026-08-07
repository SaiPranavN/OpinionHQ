/**
 * Whether a URL is safe to put in an `href`.
 *
 * WHY THIS EXISTS. Source links on the timeline are typed by an editor and
 * rendered as anchors for every visitor. `href="javascript:…"` executes on
 * click, and `data:text/html,…` opens attacker-authored markup on a page the
 * reader believes is ours — so an editor account, or anyone who ever gets one,
 * would be one paste away from scripting the site.
 *
 * An allowlist, not a blocklist. The set of schemes worth linking to is two
 * items long, and every blocklist of the dangerous ones has historically missed
 * something (`javascript:` with a newline in it, `vbscript:`, `data:` with an
 * unexpected media type).
 *
 * Returns the parsed URL rather than a boolean so the caller cannot forget to
 * use the normalised form.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // No scheme, or unparseable. A bare "example.com/x" is a plausible thing to
    // type, so it gets one chance as https rather than being dropped.
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return parsed.toString();
}

/** "thehindu.com" — what to show when the link text should be the publisher. */
export function urlHost(raw: string | null | undefined): string | null {
  const safe = safeExternalUrl(raw);
  if (!safe) return null;
  try {
    return new URL(safe).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
