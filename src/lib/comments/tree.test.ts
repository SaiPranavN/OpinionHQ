import { describe, expect, it } from "vitest";

import {
  buildThread,
  countThread,
  MAX_COMMENT_DEPTH,
  nextVote,
  replySummary,
  type Threadable,
} from "@/lib/comments/tree";

/**
 * The recursion behind both discussions in the product — reply threads under an
 * opinion and comment threads under a verified answer. It is shared, so a bug
 * here is a bug in two features, and the cases below are the ones that would
 * either lose somebody's words or hang the renderer.
 */

let clock = 0;
const entry = (id: string, parentId?: string | null): Threadable => ({
  id,
  parentId: parentId ?? null,
  // Monotonic, so "oldest first" is testable without sprinkling real dates.
  createdAt: new Date(1_700_000_000_000 + clock++ * 1000).toISOString(),
});

describe("buildThread", () => {
  it("builds the shape and counts every descendant", () => {
    clock = 0;
    const rows = [
      entry("root"),
      entry("child-1", "root"),
      entry("child-2", "root"),
      entry("grandchild", "child-1"),
      entry("second-root"),
    ];

    const tree = buildThread(rows);
    expect(tree.map((n) => n.entry.id)).toEqual(["root", "second-root"]);

    const root = tree[0]!;
    expect(root.replies.map((n) => n.entry.id)).toEqual(["child-1", "child-2"]);
    expect(root.replies[0]!.replies.map((n) => n.entry.id)).toEqual(["grandchild"]);
    // Three descendants, at any depth — what the collapse control counts.
    expect(root.total).toBe(3);
    expect(countThread(tree)).toBe(5);
  });

  it("orders oldest first at every level", () => {
    clock = 0;
    const first = entry("first");
    const second = entry("second");
    const third = entry("third", "first");
    const fourth = entry("fourth", "first");

    // Deliberately shuffled going in.
    const tree = buildThread([fourth, second, third, first]);
    expect(tree.map((n) => n.entry.id)).toEqual(["first", "second"]);
    expect(tree[0]!.replies.map((n) => n.entry.id)).toEqual(["third", "fourth"]);
  });

  it("keeps a reply whose parent was removed, as a root", () => {
    // Losing the reply as well would delete somebody's words for a reason that
    // has nothing to do with them.
    clock = 0;
    const tree = buildThread([entry("orphan", "deleted-parent"), entry("normal")]);
    expect(tree.map((n) => n.entry.id).sort()).toEqual(["normal", "orphan"]);
  });

  it("does not hang on an entry that is its own parent", () => {
    clock = 0;
    const tree = buildThread([entry("self", "self")]);
    expect(tree.map((n) => n.entry.id)).toEqual(["self"]);
    expect(tree[0]!.replies).toEqual([]);
  });

  it("does not hang on a two-node cycle", () => {
    clock = 0;
    // Both claim the other as parent. Neither can be a root by the usual rule,
    // so this is the case that would recurse forever if depth were walked
    // rather than assigned from the roots down.
    const tree = buildThread([entry("a", "b"), entry("b", "a")]);
    expect(countThread(tree)).toBeLessThanOrEqual(2);
  });

  it("caps depth without flattening the parentage", () => {
    clock = 0;
    const rows: Threadable[] = [entry("d0")];
    for (let i = 1; i <= 8; i++) rows.push(entry(`d${i}`, `d${i - 1}`));

    const tree = buildThread(rows);
    let node = tree[0]!;
    const depths: number[] = [node.depth];
    while (node.replies.length > 0) {
      node = node.replies[0]!;
      depths.push(node.depth);
    }

    // Nine levels of nesting survive as structure...
    expect(depths.length).toBe(9);
    // ...but the indent stops climbing at the cap.
    expect(Math.max(...depths)).toBe(MAX_COMMENT_DEPTH);
    expect(depths.slice(0, MAX_COMMENT_DEPTH + 1)).toEqual([0, 1, 2, 3, 4]);
    expect(depths.slice(MAX_COMMENT_DEPTH).every((d) => d === MAX_COMMENT_DEPTH)).toBe(true);
  });

  it("returns nothing for nothing", () => {
    expect(buildThread([])).toEqual([]);
    expect(countThread([])).toBe(0);
  });
});

describe("nextVote", () => {
  it("takes the vote back when the held side is pressed again", () => {
    expect(nextVote("like", "like")).toBeUndefined();
    expect(nextVote("dislike", "dislike")).toBeUndefined();
  });

  it("moves the vote when the other side is pressed", () => {
    expect(nextVote("like", "dislike")).toBe("dislike");
    expect(nextVote("dislike", "like")).toBe("like");
  });

  it("casts one when none is held", () => {
    expect(nextVote(undefined, "like")).toBe("like");
  });
});

describe("replySummary", () => {
  it("agrees in number", () => {
    expect(replySummary(1)).toBe("1 reply");
    expect(replySummary(2)).toBe("2 replies");
    expect(replySummary(0)).toBe("0 replies");
  });
});
