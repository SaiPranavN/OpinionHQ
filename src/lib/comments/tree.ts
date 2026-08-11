/**
 * Threading, for any discussion in the product.
 *
 * Lifted out of `lib/ask/comments.ts` when opinions gained threaded replies.
 * The alternative was a second copy of the same recursion, and the two would
 * have diverged on the first bug fixed in one of them — at which point a reader
 * moving between an answer thread and an opinion thread would find the same
 * gesture doing subtly different things.
 *
 * Everything here is a pure function over a flat list, so ordering, nesting and
 * the depth cap can be tested without rendering anything.
 */

/** The least a record needs for this module to thread it. */
export interface Threadable {
  id: string;
  parentId?: string | null;
  createdAt: string;
}

export interface ThreadNode<T extends Threadable> {
  entry: T;
  /** Capped at MAX_COMMENT_DEPTH — see below. */
  depth: number;
  replies: ThreadNode<T>[];
  /** Every descendant, at any depth. What the collapse control counts. */
  total: number;
}

/**
 * How deep the indentation goes.
 *
 * Four levels, then replies keep threading but stop stepping right. A cap is
 * needed for two unrelated reasons and they happen to agree: past about four
 * steps a comment on a phone has no width left, and past about four steps a
 * discussion has stopped being about the thing above it. The exchange is not
 * hidden or flattened — the parentage is intact and the rail still connects
 * it — it simply stops marching across the page.
 */
export const MAX_COMMENT_DEPTH = 4;

/**
 * Builds the tree.
 *
 * ORDERED OLDEST FIRST, at every level, rather than by score. Ranking is what a
 * forum does, and it would mean the order of a conversation changed under the
 * reader while they read it — and that a reply posted a second ago appears at
 * the bottom with zero likes, several screens below the thing it answers.
 * Chronological is what makes a thread legible as a conversation.
 *
 * An entry whose parent is missing from the list is treated as top-level rather
 * than dropped. That can only happen if the parent was removed, and losing the
 * reply as well would delete somebody's words for a reason that has nothing to
 * do with them.
 */
export function buildThread<T extends Threadable>(entries: T[]): ThreadNode<T>[] {
  const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const present = new Set(sorted.map((e) => e.id));

  const nodes = new Map<string, ThreadNode<T>>();
  for (const entry of sorted) {
    nodes.set(entry.id, { entry, depth: 0, replies: [], total: 0 });
  }

  const roots: ThreadNode<T>[] = [];
  for (const entry of sorted) {
    const node = nodes.get(entry.id)!;
    const parentId = entry.parentId;
    // An entry cannot be its own parent, and a parent that is not here is not a
    // parent. Both guards exist so a bad record cannot build a cycle and hang
    // the renderer.
    if (!parentId || parentId === entry.id || !present.has(parentId)) {
      roots.push(node);
      continue;
    }
    const parent = nodes.get(parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }
    parent.replies.push(node);
  }

  for (const root of roots) assignDepth(root, 0);
  for (const root of roots) root.total = countDescendants(root);
  return roots;
}

function assignDepth<T extends Threadable>(node: ThreadNode<T>, depth: number): void {
  node.depth = Math.min(depth, MAX_COMMENT_DEPTH);
  for (const reply of node.replies) assignDepth(reply, depth + 1);
}

function countDescendants<T extends Threadable>(node: ThreadNode<T>): number {
  let total = 0;
  for (const reply of node.replies) {
    reply.total = countDescendants(reply);
    total += 1 + reply.total;
  }
  return total;
}

/** Every entry in a tree, at any depth. */
export function countThread<T extends Threadable>(nodes: ThreadNode<T>[]): number {
  return nodes.reduce((sum, node) => sum + 1 + node.total, 0);
}

/**
 * One reader's position on one thing. Absent means they have not voted.
 *
 * Mutually exclusive by construction rather than by a rule somebody has to
 * remember: there is one value, so liking something you had disliked replaces
 * the dislike instead of standing beside it.
 */
export type Vote = "like" | "dislike";

/**
 * What the next tap means.
 *
 * Pressing the side you already picked takes the vote back; pressing the other
 * side moves it. Nobody holds both, and nobody is stuck with a vote they can
 * only change and never withdraw.
 */
export function nextVote(current: Vote | undefined, pressed: Vote): Vote | undefined {
  return current === pressed ? undefined : pressed;
}

/** "3 replies" / "1 reply" — the collapsed summary. */
export function replySummary(total: number): string {
  return `${total} ${total === 1 ? "reply" : "replies"}`;
}
