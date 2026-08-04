/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Seeded Pro contributions. The people are invented, and every count on them —
 * helpful marks, saves, reactions, block responses — is invented too.
 *
 * They exist for one reason: "Pro posts sit in the same conversation" is a
 * claim that cannot be reviewed on an empty feed. Three of them, on three
 * different topics in three different categories, so the mixed list can be
 * read rather than imagined.
 *
 * NOTE THE ENGAGEMENT NUMBERS. They are not uniformly higher than the standard
 * opinions around them — `iphone18`'s contribution is deliberately quieter than
 * the top plain opinion on the same topic, so the feed demonstrates the ranking
 * rule rather than merely asserting it: a Pro post with modest engagement sits
 * below a well-received ordinary one, because format is not an input to
 * relevance.
 */

import type { Opinion } from "@/lib/types";

export const PRO_CONTRIBUTIONS: Opinion[] = [
  {
    id: "pro-kalki2-arunima",
    topicId: "kalki2",
    name: "Arunima Sen",
    initials: "AS",
    vote: "Neutral",
    text: "",
    time: "5 hours ago",
    helpful: 2140,
    replies: 96,
    format: "pro",
    authorLine: "VFX supervisor, 11 years",
    verifiedLabel: "Film industry employment verified",
    saves: 410,
    reactions: { insightful: 288, useful: 96, well_explained: 174 },
    sections: [
      {
        id: "kal-pro-1",
        type: "headline",
        position: 0,
        text: "The scale is real. The second half is a script problem, not a budget problem.",
      },
      {
        id: "kal-pro-2",
        type: "quick_take",
        position: 1,
        text: "Two hours of this film are the best large-format work done in the country. The last forty minutes were rewritten late, and you can see exactly where.",
      },
      {
        id: "kal-pro-3",
        type: "breakdown",
        position: 2,
        text: "The desert sequence runs about nine minutes and holds up shot for shot against anything I have worked on. That is not flattery — you can tell from the lighting continuity that it was blocked once, shot properly, and left alone.\n\nWhat happens after the interval is a different film. Coverage gets tighter, the plate work gets reused, and three separate scenes stop to explain the same reveal. Late rewrites look like this from the inside: you shoot the explanation because nobody is confident the audience got it the first time.\n\nThe money is on the screen. What is missing is somebody with the authority to say the audience is smarter than that.",
      },
      {
        id: "kal-pro-4",
        type: "key_points",
        position: 3,
        points: [
          "The desert sequence is a single blocked setup — no stitching, which is why it holds",
          "Repeated exposition after the interval is the signature of a late rewrite",
          "Reused plates in the third act suggest a compressed post schedule",
          "None of this is a budget problem; the budget is visibly on screen",
        ],
      },
      {
        id: "kal-pro-5",
        type: "interactive",
        position: 4,
        block: {
          id: "kal-block",
          kind: "poll",
          prompt: "If you saw it in a theatre, which half did you rate higher?",
          options: [
            { id: "first", label: "The first half, clearly", count: 3120 },
            { id: "second", label: "The second half", count: 640 },
            { id: "even", label: "About even", count: 1180 },
          ],
        },
      },
      {
        id: "kal-pro-6",
        type: "final_verdict",
        position: 5,
        text: "Worth the big screen for the craft. Go in knowing the story gives up before the images do.",
      },
    ],
  },

  {
    id: "pro-evprice-rahul",
    topicId: "evprice",
    name: "Rahul Iyengar",
    initials: "RI",
    vote: "Negative",
    text: "",
    time: "1 day ago",
    helpful: 1680,
    replies: 143,
    format: "pro",
    authorLine: "Powertrain engineer, automotive",
    saves: 298,
    reactions: { insightful: 210, useful: 187, well_explained: 88 },
    sections: [
      {
        id: "ev-pro-1",
        type: "headline",
        position: 0,
        text: "The sticker price is not the number that decides this. The residual is.",
      },
      {
        id: "ev-pro-2",
        type: "quick_take",
        position: 1,
        text: "Everyone argues about the on-road price and nobody asks what the car is worth in four years. That gap is where the actual cost of ownership lives.",
      },
      {
        id: "ev-pro-3",
        type: "key_points",
        position: 2,
        points: [
          "Battery warranty transfer terms matter more than warranty length",
          "Resale is thin because buyers cannot verify pack health independently",
          "Home charging changes the maths completely; apartment parking does not",
          "Service network depth is the real constraint outside the top eight cities",
        ],
      },
      {
        id: "ev-pro-4",
        type: "interactive",
        position: 3,
        block: {
          id: "ev-block",
          kind: "rank",
          prompt: "Which of these would actually decide it for you?",
          options: [
            { id: "resale", label: "Resale value in four years", count: 890 },
            { id: "charging", label: "Where I can charge", count: 1450 },
            { id: "service", label: "Service network near me", count: 720 },
            { id: "upfront", label: "The price on the day", count: 1090 },
          ],
        },
      },
      {
        id: "ev-pro-5",
        type: "final_verdict",
        position: 4,
        text: "If you have home charging and keep cars past five years, the maths works. If either is untrue, it does not yet.",
      },
    ],
  },

  {
    // Deliberately modest engagement — see the header note.
    id: "pro-iphone18-meera",
    topicId: "iphone18",
    name: "Meera Krishnan",
    initials: "MK",
    vote: "Neutral",
    text: "",
    time: "3 hours ago",
    helpful: 240,
    replies: 18,
    format: "pro",
    authorLine: "Mobile hardware analyst",
    saves: 61,
    reactions: { insightful: 34, useful: 22 },
    sections: [
      {
        id: "ip-pro-1",
        type: "headline",
        position: 0,
        text: "A modem change is a bigger deal than any of the camera numbers",
      },
      {
        id: "ip-pro-2",
        type: "quick_take",
        position: 1,
        text: "The spec sheet leads with the sensor. The thing you will actually notice on a bad network is the part nobody put on the slide.",
      },
      {
        id: "ip-pro-3",
        type: "interactive",
        position: 2,
        block: {
          id: "ip-block",
          kind: "agree_challenge",
          prompt: "Is modem performance worth more to you than a camera upgrade?",
          options: [
            { id: "agree", label: "Agree — signal matters more day to day", count: 410 },
            { id: "challenge", label: "Challenge — the camera is why I upgrade", count: 355 },
            { id: "unsure", label: "Depends entirely on my network", count: 190 },
          ],
        },
      },
    ],
  },
];

export function proContributionsFor(topicId: string): Opinion[] {
  return PRO_CONTRIBUTIONS.filter((c) => c.topicId === topicId);
}
