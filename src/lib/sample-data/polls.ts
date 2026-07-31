/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Head-to-head polls. Every vote count below is invented. The matchups are
 * drawn from genuinely contested public arguments so the copy reads
 * realistically, and are deliberately matters of taste or judgement rather
 * than questions of fact — a poll is the wrong instrument for settling what
 * actually happened.
 *
 * In production these are rows in `Poll` + `PollOption`, created by editors or
 * through the composer, and the counts come from real votes.
 */

import type { Poll } from "@/lib/types";

export const POLLS: Poll[] = [
  {
    id: "theatre-ott",
    question: "Opening weekend in a theatre, or day-one on streaming?",
    cat: "entertainment",
    status: "Live",
    summary:
      "Studios keep shortening the theatrical window. Audiences are split on whether they want it shortened at all.",
    about:
      "Most major releases now reach streaming within four to six weeks. Exhibitors argue the theatre is the film; platforms argue the audience has already voted with its sofa. This poll asks which you would actually pick for a film you are excited about.",
    tags: ["cinema", "streaming", "release windows", "exhibition"],
    a: {
      id: "a",
      name: "Theatre, opening weekend",
      blurb: "A full room, a big screen, and no pause button.",
      votes: 21840,
    },
    b: {
      id: "b",
      name: "Streaming, day one",
      blurb: "Your sofa, your subtitles, and four people instead of four hundred.",
      votes: 19260,
    },
    closes: "Open until 15 Aug 2026",
    spread: 16,
    trend: 96,
    recency: 1,
    updated: "20m ago",
  },
  {
    id: "messi-ronaldo",
    question: "Messi or Ronaldo?",
    cat: "sports",
    status: "Live",
    summary:
      "Two decades on, both have retired from the argument and nobody else has. The most reliably unresolvable poll in sport.",
    about:
      "The two most decorated careers in modern football, judged on very different terms: one on invention, the other on relentlessness. No trophy count settles it, which is precisely why the question keeps being asked.",
    tags: ["football", "goat debate", "legacy"],
    a: {
      id: "a",
      name: "Lionel Messi",
      blurb: "The one who made the impossible pass look obvious afterwards.",
      votes: 38470,
    },
    b: {
      id: "b",
      name: "Cristiano Ronaldo",
      blurb: "The one who rebuilt himself four times and kept scoring.",
      votes: 31260,
    },
    closes: "Open-ended",
    spread: 14,
    trend: 99,
    recency: 1,
    updated: "8m ago",
  },
  {
    id: "iphone-pixel",
    question: "iPhone 18 Pro or Pixel 11 Pro?",
    cat: "technology",
    status: "Live",
    summary:
      "One costs 38% more and holds its value. The other takes the better photograph straight out of the box.",
    about:
      "Both launched within a fortnight of each other in July 2026. The comparison has narrowed to three things: the price gap in India, computational photography, and how long each will keep getting updates.",
    tags: ["smartphone", "apple", "google", "pricing"],
    a: {
      id: "a",
      name: "iPhone 18 Pro",
      blurb: "Six years of updates and a resale value that still surprises people.",
      votes: 24310,
    },
    b: {
      id: "b",
      name: "Pixel 11 Pro",
      blurb: "The better camera for the money, if you can live with the resale.",
      votes: 26980,
    },
    closes: "Open until 30 Sep 2026",
    spread: 12,
    trend: 94,
    recency: 1,
    updated: "1h ago",
  },
  {
    id: "ev-hybrid",
    question: "Electric or hybrid, for Indian roads in 2026?",
    cat: "technology",
    status: "Live",
    summary:
      "Charging has improved a lot in eight cities and almost nowhere else. That single fact decides most votes.",
    about:
      "Mass-market electric cars are now priced within reach of a hybrid, but the charging network remains concentrated in metros and along a few highway corridors. Long-distance drivers and city commuters answer this very differently.",
    tags: ["electric vehicles", "hybrid", "charging", "automotive"],
    a: {
      id: "a",
      name: "Full electric",
      blurb: "Cheaper per kilometre, quieter, and the network is catching up.",
      votes: 18420,
    },
    b: {
      id: "b",
      name: "Hybrid",
      blurb: "No range anxiety on a highway with one working charger.",
      votes: 20140,
    },
    closes: "Open until 31 Dec 2026",
    spread: 15,
    trend: 88,
    recency: 2,
    updated: "3h ago",
  },
  {
    id: "wfh-office",
    question: "Work from home, or five days in the office?",
    cat: "careers",
    status: "Live",
    summary:
      "Return-to-office mandates keep landing. The people receiving them keep disagreeing with the people issuing them.",
    about:
      "Most large employers have now settled on either a hybrid arrangement or a full return. This poll deliberately forces the two extremes, because that is how the mandates are written.",
    tags: ["remote work", "return to office", "employment", "commute"],
    a: {
      id: "a",
      name: "Work from home",
      blurb: "Three hours of your day back, and the work still gets done.",
      votes: 34760,
    },
    b: {
      id: "b",
      name: "Office, five days",
      blurb: "You learn faster in a room, especially in your first five years.",
      votes: 12480,
    },
    closes: "Open-ended",
    spread: 15,
    trend: 97,
    recency: 1,
    updated: "35m ago",
  },
  {
    id: "mba-ms",
    question: "MBA in India, or MS abroad?",
    cat: "careers",
    status: "Live",
    summary:
      "Roughly the same money. Visa rules tightened in three countries, and consulting hiring is down two years running.",
    about:
      "A two-year MBA at a top Indian institute and a self-funded taught masters abroad now cost within a few lakh of each other. The variables that decide it are post-study work rights, hiring in your function, and whether you intend to come back.",
    tags: ["mba", "masters", "study abroad", "roi"],
    a: {
      id: "a",
      name: "MBA in India",
      blurb: "Network at home, no visa lottery, and you start earning sooner.",
      votes: 22140,
    },
    b: {
      id: "b",
      name: "MS abroad",
      blurb: "Harder route, wider ceiling — if the work rights survive your degree.",
      votes: 19870,
    },
    closes: "Open until 20 Aug 2026",
    spread: 14,
    trend: 92,
    recency: 2,
    updated: "2h ago",
  },
  {
    id: "iit-ivy",
    question: "An IIT seat, or an Ivy League seat at the same cost?",
    cat: "colleges",
    status: "Live",
    summary:
      "The hypothetical every JEE aspirant's family has argued about at least once. Cost held equal on purpose.",
    about:
      "Undergraduate admission to an IIT versus an equivalently ranked US university, with the cost difference removed so the answer is about outcomes rather than affordability. Placement access, peer group and mobility all pull in different directions.",
    tags: ["iit", "ivy league", "undergraduate", "admissions"],
    a: {
      id: "a",
      name: "IIT",
      blurb: "The alumni network opens doors here for thirty years.",
      votes: 27650,
    },
    b: {
      id: "b",
      name: "Ivy League",
      blurb: "Global mobility, smaller classes, and a different ceiling.",
      votes: 20310,
    },
    closes: "Open-ended",
    spread: 17,
    trend: 90,
    recency: 2,
    updated: "4h ago",
  },
  {
    id: "neet-jee",
    question: "NEET UG or JEE Advanced — which is genuinely harder?",
    cat: "exams",
    status: "Live",
    summary:
      "One rewards precision under volume, the other rewards depth under time. Every aspirant is certain it is theirs.",
    about:
      "A comparison of the two largest undergraduate entrance examinations on difficulty rather than prestige: NEET's breadth and negative-marking pressure against JEE Advanced's depth and multi-step problems.",
    tags: ["neet", "jee advanced", "entrance exams", "difficulty"],
    a: {
      id: "a",
      name: "NEET UG",
      blurb: "180 questions, no second chances, and one silly error costs 4,000 ranks.",
      votes: 29840,
    },
    b: {
      id: "b",
      name: "JEE Advanced",
      blurb: "Fewer questions, each one built to break a memorised method.",
      votes: 33170,
    },
    closes: "Open-ended",
    spread: 20,
    trend: 95,
    recency: 1,
    updated: "45m ago",
  },
  {
    id: "metro-roads",
    question: "Metro expansion or road widening — where should the city budget go?",
    cat: "policies",
    status: "Live",
    summary:
      "The same capital funds roughly 12 km of metro or 60 km of widened arterial road. One of them has to lose.",
    about:
      "A direct trade-off in urban transport capital spending. Metro carries far more people per rupee at peak but takes years and serves fixed corridors; road widening is faster and more visible, and a large body of evidence says it refills within three years.",
    tags: ["urban transport", "metro", "roads", "capital spending"],
    a: {
      id: "a",
      name: "Metro expansion",
      blurb: "More people moved per rupee, permanently — if you can wait six years.",
      votes: 24980,
    },
    b: {
      id: "b",
      name: "Road widening",
      blurb: "Relief this year, on the routes people actually drive.",
      votes: 13640,
    },
    closes: "Open until 30 Aug 2026",
    spread: 15,
    trend: 86,
    recency: 3,
    updated: "7h ago",
  },
  {
    id: "tax-regime",
    question: "Old tax regime or new?",
    cat: "policies",
    status: "Live",
    summary:
      "Lower rates and no deductions, against higher rates and every exemption you can document. It flips at a surprisingly low income.",
    about:
      "The new regime offers lower slab rates with almost no deductions; the old one keeps exemptions for housing, insurance and long-term savings. Which wins depends almost entirely on how much you claim, and most filers have never done the arithmetic.",
    tags: ["income tax", "deductions", "personal finance"],
    a: {
      id: "a",
      name: "Old regime",
      blurb: "Worth the paperwork if you have a home loan and actually claim it.",
      votes: 16720,
    },
    b: {
      id: "b",
      name: "New regime",
      blurb: "Lower rates, no receipts, no April panic.",
      votes: 22410,
    },
    closes: "Open until 31 Jul 2026",
    spread: 18,
    trend: 84,
    recency: 3,
    updated: "9h ago",
  },
  {
    id: "chai-coffee",
    question: "Chai or coffee?",
    cat: "brands",
    status: "Live",
    summary:
      "The least consequential poll on the platform and reliably the most voted. The regional split is the sharpest of anything here.",
    about:
      "A deliberately light poll that produces the sharpest geographic divide on OpinionHQ. Tamil Nadu and Karnataka answer it almost inversely to the north — filter coffee against three cups of chai a day — which is why the regional breakdown matters more than the headline number.",
    tags: ["chai", "coffee", "food and drink", "regional"],
    a: {
      id: "a",
      name: "Chai",
      blurb: "Three times a day, and the fourth one is for company.",
      votes: 41230,
    },
    b: {
      id: "b",
      name: "Coffee",
      blurb: "Filter, in a steel tumbler, before anyone speaks to you.",
      votes: 28940,
    },
    closes: "Open-ended",
    spread: 34,
    // Filter-coffee country really does answer this the other way round.
    regionOverrides: {
      "Tamil Nadu": 18,
      Karnataka: 27,
      Maharashtra: 61,
      "Uttar Pradesh": 88,
      "Delhi NCR": 85,
      "West Bengal": 74,
      "Other states": 62,
    },
    trend: 93,
    recency: 2,
    updated: "1h ago",
  },
  {
    id: "t20-test",
    question: "T20 or Test cricket?",
    cat: "sports",
    status: "Live",
    summary:
      "Boards fund one and revere the other. Ask the people watching which they would keep and the answer is not obvious.",
    about:
      "T20 pays for the sport and fills the stadiums; Test cricket is where careers are still judged. With a crowded calendar forcing choices about which format gets the best players, this trade-off is now an administrative question rather than a philosophical one.",
    tags: ["cricket", "test cricket", "t20", "calendar"],
    a: {
      id: "a",
      name: "T20",
      blurb: "Three hours, a result, and a full house on a weekday.",
      votes: 17840,
    },
    b: {
      id: "b",
      name: "Test cricket",
      blurb: "Five days to find out who can actually play.",
      votes: 25610,
    },
    closes: "Open-ended",
    spread: 22,
    trend: 89,
    recency: 3,
    updated: "6h ago",
  },
  {
    id: "cook-order",
    question: "Cook at home, or order in?",
    cat: "food",
    status: "Live",
    summary:
      "Delivery fees have climbed far enough that the arithmetic has genuinely changed for a weeknight dinner.",
    about:
      "A weeknight dinner for two, cooked from ingredients you already partly have, against the same meal ordered once fees and packaging are added. The answer depends heavily on how much you value forty minutes.",
    tags: ["cooking", "delivery", "weeknight", "budget"],
    a: {
      id: "a",
      name: "Cook at home",
      blurb: "A third of the price, and you know what went in it.",
      votes: 26840,
    },
    b: {
      id: "b",
      name: "Order in",
      blurb: "Forty minutes of your evening back, and nothing to wash up.",
      votes: 19310,
    },
    closes: "Open-ended",
    spread: 18,
    trend: 91,
    recency: 2,
    updated: "2h ago",
  },
  {
    id: "biryani-style",
    question: "Hyderabadi or Lucknowi biryani?",
    cat: "food",
    status: "Live",
    summary:
      "Kacchi and fiery against slow-cooked and delicate. The most cheerfully unwinnable argument in Indian food.",
    about:
      "Two distinct traditions rather than two versions of one dish: Hyderabadi dum layers raw marinated meat under rice and cooks them together hot and spiced; Lucknowi pakki cooks them separately and aims for restraint. Nobody has ever conceded this argument.",
    tags: ["biryani", "hyderabadi", "lucknowi", "regional food"],
    a: {
      id: "a",
      name: "Hyderabadi",
      blurb: "Heat, mirchi ka salan, and rice that fought for its flavour.",
      votes: 31470,
    },
    b: {
      id: "b",
      name: "Lucknowi",
      blurb: "Subtle, perfumed, and it does not need to shout.",
      votes: 24160,
    },
    closes: "Open-ended",
    spread: 26,
    trend: 94,
    recency: 1,
    updated: "25m ago",
  },
];

export const POLLS_BY_ID: ReadonlyMap<string, Poll> = new Map(
  POLLS.map((p) => [p.id, p]),
);
