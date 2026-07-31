import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Manrope } from "next/font/google";

import { PrototypeProvider } from "@/components/prototype/PrototypeProvider";
import { Nav } from "@/components/site/Nav";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
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
      className={`${manrope.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <PrototypeProvider>
          <Nav />
          {/* `overflow-x: clip` rather than `hidden`: `hidden` turns this into a
              scroll container, which silently breaks `position: sticky` for the
              trending ticker inside it. `clip` trims the same overflow without
              creating one. */}
          <main className="relative min-h-screen overflow-x-clip bg-ink">{children}</main>
        </PrototypeProvider>
      </body>
    </html>
  );
}
