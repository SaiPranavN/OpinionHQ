/**
 * Comment shape — the tree, the depth cap, the counts.
 *
 * Separate from `access.ts` on purpose: that module decides *who may*, this one
 * decides *what it looks like*. Mixing them is how a display rule ends up being
 * relied on as a privacy rule.
 *
 * Everything here is a pure function over a flat list, so the ordering and the
 * nesting can be tested without rendering anything.
 */

import type { AnswerComment, CommentNode } from "@/lib/ask/types";

/**
 * How deep the indentation goes.
 *
 * Four levels, then replies keep threading but stop stepping right. A cap is
 * needed for two unrelated reasons and they happen to agree: past about four
 * steps a comment on a phone has no width left, and past about four steps a
 * discussion has stopped being about the answer above it. The exchange is not
 * hidden or flattened — the parentage is intact and the rail still connects
 * it — it simply stops marching across the page.
 */
export const MAX_COMMENT_DEPTH = 4;

/**
 * Builds the tree.
 *
 * ORDERED OLDEST FIRST, at every level, rather than by likes. Ranking by score
 * is what a forum does, and it would mean the order of a conversation changed
 * under the reader while they read it — and that a reply posted a second ago
 * appears at the bottom with zero likes, below the thing it answers by several
 * screens. Chronological is what makes a thread legible as a conversation.
 *
 * A comment whose parent is missing from the list is treated as top-level
 * rather than dropped. That can only happen if the parent was removed, and
 * losing the reply as well would delete somebody's words for a reason that has
 * nothing to do with them.
 */
export function commentTree(comments: AnswerComment[]): CommentNode[] {
  const sorted = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const present = new Set(sorted.map((c) => c.id));

  const nodes = new Map<string, CommentNode>();
  for (const comment of sorted) {
    nodes.set(comment.id, { comment, depth: 0, replies: [], total: 0 });
  }

  const roots: CommentNode[] = [];
  for (const comment of sorted) {
    const node = nodes.get(comment.id)!;
    const parentId = comment.parentId;
    // A comment cannot be its own parent, and a parent that is not here is not
    // a parent. Both guards exist so a bad record cannot build a cycle and
    // hang the renderer.
    if (!parentId || parentId === comment.id || !present.has(parentId)) {
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

function assignDepth(node: CommentNode, depth: number): void {
  node.depth = Math.min(depth, MAX_COMMENT_DEPTH);
  for (const reply of node.replies) assignDepth(reply, depth + 1);
}

function countDescendants(node: CommentNode): number {
  let total = 0;
  for (const reply of node.replies) {
    reply.total = countDescendants(reply);
    total += 1 + reply.total;
  }
  return total;
}

/** Every comment in a tree, at any depth. */
export function countComments(nodes: CommentNode[]): number {
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
 * What the counter reads.
 *
 * The stored number is what everybody else did; the viewer's own vote is held
 * separately, because in this build there is no server to write it to. Adding
 * them at display time keeps the two straight — a seeded count is somebody
 * else's, and one of them is never you.
 */
export function voteCount(
  base: number | undefined,
  kind: Vote,
  mine: Vote | undefined,
): number {
  return Math.max(base ?? 0, 0) + (mine === kind ? 1 : 0);
}

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
