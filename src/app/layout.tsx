import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Plus_Jakarta_Sans } from "next/font/google";

import { AmbientBackground } from "@/components/ambient/AmbientBackground";
import { CardSpotlight } from "@/components/ambient/CardSpotlight";
import { AskProvider } from "@/components/ask/AskProvider";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { PrototypeProvider } from "@/components/prototype/PrototypeProvider";
import { Nav } from "@/components/site/Nav";
import { THEME_BOOT_SCRIPT, ThemeProvider } from "@/components/site/ThemeProvider";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * The display face — every heading on every page.
 *
 * Chosen as the closest freely-licensed stand-in for Uber Move: geometric
 * skeleton, tall x-height, low contrast, tight apertures. Uber Move itself is
 * licensed to Uber and cannot be used here, and a paid clone would be a
 * dependency the prototype does not need to prove the look.
 *
 * IT REPLACED A SERIF, and that is a bigger change than a font swap. The old
 * Instrument Serif carried the emphasis in these headings through its italic —
 * a genuinely different set of letterforms. A geometric sans has no such
 * register: its italic is close to a slant. So the `<em>` runs still lean, but
 * the weight below is what actually does the work now.
 *
 * Only the weights the headings use are downloaded. 500 and 600 are here for
 * smaller headings, 700 and 800 for display sizes; 400 is deliberately absent,
 * because a heading set at the body weight is what made the old sans headings
 * look unfinished.
 */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OpinionHQ — What does everyone really think?",
    template: "%s · OpinionHQ",
  },
  description:
    "Structured public opinion on the things that matter. Vote, discuss, and watch sentiment shift in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font variables live on <html>: Tailwind's --font-* theme tokens are
    // declared at :root and their var() references must resolve on the same
    // element, otherwise they compute to guaranteed-invalid and fall back.
    <html
      lang="en"
      // Matches what the boot script writes, so the server HTML and the
      // pre-hydration DOM agree for anyone who has not chosen light.
      data-theme="dark"
      suppressHydrationWarning
      className={`${manrope.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Blocking on purpose: it must win the race against first paint, or
            a visitor who chose light gets a full-page white-to-dark flash on
            every navigation. It is two statements and touches one attribute. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {/* Sits behind everything on its own fixed layer, so scrolling moves
              content across it rather than dragging it along. Picks its own
              variant from the route — no page mounts a background of its own. */}
          <AmbientBackground />
          {/* One delegated pointer listener for every `[data-spotlight]` card
              on the page, rather than one listener per card. */}
          <CardSpotlight />
          {/* Outermost of the three, because both of the others ask it who is
              signed in. It is the only one backed by a server: the two below
              still keep their state in this browser. */}
          <SessionProvider>
            <PrototypeProvider>
              {/* Private-guidance state nests inside the session but keeps its own
                  store and its own storage key. Topics and polls are public
                  measurement objects; Ask Verified holds one-to-one consultations
                  with an access-control list, and sharing a store between them is
                  how a private question ends up in a public feed. */}
              <AskProvider>
                <Nav />
                {/* `overflow-x: clip` rather than `hidden`: `hidden` turns this into
                    a scroll container, which silently breaks `position: sticky` for
                    the trending ticker inside it. `clip` trims the same overflow
                    without creating one.

                    Deliberately transparent: an opaque `bg-ink` here would cover
                    the ambient background entirely. The page colour comes from
                    <body>, and the background layer paints over it. */}
                <main className="relative min-h-screen overflow-x-clip">{children}</main>
              </AskProvider>
            </PrototypeProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
