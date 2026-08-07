/**
 * The fixtures, decorated — for tests and for the landing page's illustrations.
 *
 * WHY THIS EXISTS SEPARATELY. `lib/topics.ts` used to hand these out as *the*
 * read model, so a component asking for "all topics" got a file and could not
 * tell. Now the read model is `lib/topics/queries.ts` and reads Postgres, and
 * anything still wanting made-up data has to say so by importing from a
 * directory named `sample-data`.
 *
 * TWO LEGITIMATE CALLERS, and no third:
 *
 *   - the unit tests, which need a stable corpus to assert derivations against.
 *     `decorate` is pure, so a fixture is exactly the right input.
 *   - the landing page's diagrams, which draw one dashboard's geometry to show
 *     what the product looks like. They illustrate a layout, not a measurement.
 *
 * Anything that renders a number a visitor could read as a real count of real
 * people belongs on the query layer instead. See AGENTS.md §7.
 */

import { decorate } from "@/lib/derive";
import { TOPICS } from "@/lib/sample-data/topics";
import type { DecoratedTopic } from "@/lib/types";

const DECORATED: DecoratedTopic[] = TOPICS.map(decorate);

export function sampleTopics(): DecoratedTopic[] {
  return DECORATED;
}

export function sampleTopic(id: string): DecoratedTopic | undefined {
  return DECORATED.find((topic) => topic.id === id);
}
