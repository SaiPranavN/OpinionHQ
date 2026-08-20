/**
 * Merges class names, with later Tailwind utilities winning.
 *
 * Every component pulled from shadcn or 21st.dev imports this, and imports it
 * from `@/lib/utils` by convention — `components.json` points the alias here
 * instead, so those components work unedited without this project growing a
 * file called `utils` that means nothing.
 *
 * `clsx` handles the conditionals; `twMerge` resolves the conflicts clsx
 * cannot see. Without the merge, `cn("px-4", "px-6")` emits both and the
 * winner is whichever CSS rule the bundler happened to order last, which is a
 * bug that only appears in a production build.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
