/**
 * What the search bar offers while you type.
 *
 * Ranked, not filtered. A substring match on any field would put "Bengaluru
 * Metro Yellow Line Delay" above "Metro expansion or road widening?" for the
 * query `metro` purely because it is longer, which is the opposite of useful.
 * The scoring below is the whole module: a hit at the start of a name beats a
 * hit in the middle of one, a name beats a tag, and a tie is broken by how
 * busy the artifact is rather than by array order.
 *
 * Pure and synchronous. In production this is an endpoint; the shape of what
 * it returns is what the component depends on, not where it came from.
 */

export type SuggestionKind = "topic" | "poll" | "question" | "category" | "place" | "tag";

export interface SuggestItem {
  id: string;
  /** What is shown, and the field matched hardest against. */
  label: string;
  kind: SuggestionKind;
  /** Where picking it goes. Absent means "put this in the search box". */
  href?: string;
  /** The second line — category, place, vote count. */
  hint?: string;
  /** Extra text worth matching: tags, category label, place, option names. */
  keywords?: string[];
  /** Higher wins a tie. Participation, votes — whatever "busy" means here. */
  weight?: number;
}

export interface Suggestion extends SuggestItem {
  score: number;
  /** `[start, end)` of the matched run in `label`, for highlighting. */
  range?: [number, number];
}

const NAME_START = 1000;
const WORD_START = 700;
const NAME_INSIDE = 400;
const KEYWORD_START = 260;
const KEYWORD_INSIDE = 120;

function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Where `needle` matches `haystack`, and how good the match is.
 *
 * Word-start matching is what makes "metro" find "Bengaluru Metro" — people
 * search for the distinctive word in a name, and it is rarely the first one.
 */
function scoreText(haystack: string, needle: string): { score: number; at: number } | null {
  const text = fold(haystack);
  const at = text.indexOf(needle);
  if (at < 0) return null;
  if (at === 0) return { score: NAME_START, at };
  const before = text.charAt(at - 1);
  if (before === " " || before === "-" || before === "(") return { score: WORD_START, at };
  return { score: NAME_INSIDE, at };
}

/**
 * Rank an index against a query.
 *
 * Below two characters nothing is returned. One letter matches most of the
 * catalog, and a list that changes completely on the second keystroke reads as
 * broken rather than as fast.
 */
export function suggest(
  query: string,
  index: readonly SuggestItem[],
  limit = 7,
): Suggestion[] {
  const needle = fold(query.trim());
  if (needle.length < 2) return [];

  const hits: Suggestion[] = [];

  for (const item of index) {
    const onLabel = scoreText(item.label, needle);
    let score = onLabel?.score ?? 0;
    const range: [number, number] | undefined = onLabel
      ? [onLabel.at, onLabel.at + needle.length]
      : undefined;

    if (!onLabel) {
      for (const keyword of item.keywords ?? []) {
        const hit = scoreText(keyword, needle);
        if (!hit) continue;
        const value = hit.score >= WORD_START ? KEYWORD_START : KEYWORD_INSIDE;
        if (value > score) score = value;
      }
    }

    if (score === 0) continue;
    // A short label matching is a more precise hit than a long one: "Goa in
    // Peak Season" is a better answer for `goa` than a 60-character question
    // that happens to contain it.
    score += Math.max(0, 60 - item.label.length);
    hits.push({ ...item, score, range });
  }

  return hits
    .sort((a, b) => b.score - a.score || (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * The rotating hints shown in an empty search box.
 *
 * Real queries that return real results, not invented ones. A placeholder
 * promising something the catalog cannot answer teaches the wrong thing about
 * what is in here.
 */
export function hintCycle(index: readonly SuggestItem[], count = 5): string[] {
  const named = index.filter((item) => item.kind === "topic" || item.kind === "poll" || item.kind === "question");
  const spread: string[] = [];
  const step = Math.max(1, Math.floor(named.length / count));
  for (let i = 0; i < named.length && spread.length < count; i += step) {
    const label = named[i]?.label;
    if (label) spread.push(label.length > 42 ? `${label.slice(0, 40).trimEnd()}…` : label);
  }
  return spread;
}
