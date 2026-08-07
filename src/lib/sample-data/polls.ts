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

import type { Poll, PollHistoryPoint } from "@/lib/types";

/**
 * Compact constructor for a recorded reading.
 *
 * `h("2026-03-02", [54, 46], "Fee revision announced")`
 *
 * The readings below are invented like every other number in this directory,
 * but they are *authored* rather than generated: each one is a value somebody
 * decided on, and the events attached to the ones that move explain why. A
 * seeded wobble would have been a tenth of the typing and would have produced
 * a chart of noise that looked exactly like a chart of findings.
 */
function h(date: string, pcts: number[], event?: string): PollHistoryPoint {
  return event ? { date, pcts, event } : { date, pcts };
}


export const POLLS: Poll[] = [
  {
    id: "theatre-ott",
    question: "Opening weekend in a theatre, or day-one on streaming?",
    cat: "entertainment",
    place: "india",
    status: "Live",
    summary:
      "Studios keep shortening the theatrical window. Audiences are split on whether they want it shortened at all.",
    about:
      "Most major releases now reach streaming within four to six weeks. Exhibitors argue the theatre is the film; platforms argue the audience has already voted with its sofa. This poll asks which you would actually pick for a film you are excited about.",
    tags: ["cinema", "streaming", "release windows", "exhibition"],
    options: [
      {
        id: "a",
        name: "Theatre, opening weekend",
        blurb: "A full room, a big screen, and no pause button.",
        votes: 21840,
      },
      {
        id: "b",
        name: "Streaming, day one",
        blurb: "Your sofa, your subtitles, and four people instead of four hundred.",
        votes: 19260,
      },
    ],
    history: [
      h("2026-02-08", [63, 37]),
      h("2026-03-08", [61, 39]),
      h("2026-04-05", [58, 42], "Two tentpole releases move to a 3-week window"),
      h("2026-05-03", [56, 44]),
      h("2026-05-31", [52, 48]),
      h("2026-06-28", [49, 51], "A major studio announces day-and-date for all 2027 titles"),
      h("2026-07-12", [51, 49]),
      h("2026-08-01", [53, 47], "Record opening weekend for a domestic release"),
    ],
    closes: "Open until 15 Aug 2026",
    trend: 96,
    recency: 1,
    updated: "20m ago",
  },
  {
    id: "messi-ronaldo",
    question: "Messi or Ronaldo?",
    cat: "sports",
    place: "worldwide",
    status: "Live",
    summary:
      "Two decades on, both have retired from the argument and nobody else has. The most reliably unresolvable poll in sport.",
    about:
      "The two most decorated careers in modern football, judged on very different terms: one on invention, the other on relentlessness. No trophy count settles it, which is precisely why the question keeps being asked.",
    tags: ["football", "goat debate", "legacy"],
    options: [
      {
        id: "a",
        name: "Lionel Messi",
        blurb: "The one who made the impossible pass look obvious afterwards.",
        votes: 38470,
      },
      {
        id: "b",
        name: "Cristiano Ronaldo",
        blurb: "The one who rebuilt himself four times and kept scoring.",
        votes: 31260,
      },
    ],
    closes: "Open-ended",
    trend: 99,
    recency: 1,
    updated: "8m ago",
  },
  {
    id: "iphone-pixel",
    question: "iPhone 18 Pro or Pixel 11 Pro?",
    cat: "technology",
    place: "india",
    status: "Live",
    summary:
      "One costs 38% more and holds its value. The other takes the better photograph straight out of the box.",
    about:
      "Both launched within a fortnight of each other in July 2026. The comparison has narrowed to three things: the price gap in India, computational photography, and how long each will keep getting updates.",
    tags: ["smartphone", "apple", "google", "pricing"],
    options: [
      {
        id: "a",
        name: "iPhone 18 Pro",
        blurb: "Six years of updates and a resale value that still surprises people.",
        votes: 24310,
      },
      {
        id: "b",
        name: "Pixel 11 Pro",
        blurb: "The better camera for the money, if you can live with the resale.",
        votes: 26980,
      },
    ],
    closes: "Open until 30 Sep 2026",
    trend: 94,
    recency: 1,
    updated: "1h ago",
  },
  {
    id: "ev-hybrid",
    question: "Electric or hybrid, for Indian roads in 2026?",
    cat: "technology",
    place: "india",
    status: "Live",
    summary:
      "Charging has improved a lot in eight cities and almost nowhere else. That single fact decides most votes.",
    about:
      "Mass-market electric cars are now priced within reach of a hybrid, but the charging network remains concentrated in metros and along a few highway corridors. Long-distance drivers and city commuters answer this very differently.",
    tags: ["electric vehicles", "hybrid", "charging", "automotive"],
    options: [
      {
        id: "a",
        name: "Full electric",
        blurb: "Cheaper per kilometre, quieter, and the network is catching up.",
        votes: 18420,
      },
      {
        id: "b",
        name: "Hybrid",
        blurb: "No range anxiety on a highway with one working charger.",
        votes: 20140,
      },
    ],
    closes: "Open until 31 Dec 2026",
    trend: 88,
    recency: 2,
    updated: "3h ago",
  },
  {
    id: "wfh-office",
    question: "Work from home, or five days in the office?",
    cat: "careers",
    place: "india",
    status: "Live",
    summary:
      "Return-to-office mandates keep landing. The people receiving them keep disagreeing with the people issuing them.",
    about:
      "Most large employers have now settled on either a hybrid arrangement or a full return. This poll deliberately forces the two extremes, because that is how the mandates are written.",
    tags: ["remote work", "return to office", "employment", "commute"],
    options: [
      {
        id: "a",
        name: "Work from home",
        blurb: "Three hours of your day back, and the work still gets done.",
        votes: 34760,
      },
      {
        id: "b",
        name: "Office, five days",
        blurb: "You learn faster in a room, especially in your first five years.",
        votes: 12480,
      },
    ],
    history: [
      h("2026-01-11", [81, 19]),
      h("2026-02-15", [80, 20]),
      h("2026-03-22", [77, 23], "Three large employers announce four-day office mandates"),
      h("2026-04-26", [75, 25]),
      h("2026-05-24", [76, 24]),
      h("2026-06-21", [74, 26], "Metro fare revision lands in two cities"),
      h("2026-07-19", [74, 26]),
      h("2026-08-01", [74, 26]),
    ],
    closes: "Open-ended",
    trend: 97,
    recency: 1,
    updated: "35m ago",
  },
  {
    id: "mba-ms",
    question: "MBA in India, or MS abroad?",
    cat: "careers",
    place: "india",
    status: "Live",
    summary:
      "Roughly the same money. Visa rules tightened in three countries, and consulting hiring is down two years running.",
    about:
      "A two-year MBA at a top Indian institute and a self-funded taught masters abroad now cost within a few lakh of each other. The variables that decide it are post-study work rights, hiring in your function, and whether you intend to come back.",
    tags: ["mba", "masters", "study abroad", "roi"],
    options: [
      {
        id: "a",
        name: "MBA in India",
        blurb: "Network at home, no visa lottery, and you start earning sooner.",
        votes: 22140,
      },
      {
        id: "b",
        name: "MS abroad",
        blurb: "Harder route, wider ceiling — if the work rights survive your degree.",
        votes: 19870,
      },
    ],
    closes: "Open until 20 Aug 2026",
    trend: 92,
    recency: 2,
    updated: "2h ago",
  },
  {
    id: "iit-ivy",
    question: "An IIT seat, or an Ivy League seat at the same cost?",
    cat: "colleges",
    place: "india",
    status: "Live",
    summary:
      "The hypothetical every JEE aspirant's family has argued about at least once. Cost held equal on purpose.",
    about:
      "Undergraduate admission to an IIT versus an equivalently ranked US university, with the cost difference removed so the answer is about outcomes rather than affordability. Placement access, peer group and mobility all pull in different directions.",
    tags: ["iit", "ivy league", "undergraduate", "admissions"],
    options: [
      {
        id: "a",
        name: "IIT",
        blurb: "The alumni network opens doors here for thirty years.",
        votes: 27650,
      },
      {
        id: "b",
        name: "Ivy League",
        blurb: "Global mobility, smaller classes, and a different ceiling.",
        votes: 20310,
      },
    ],
    closes: "Open-ended",
    trend: 90,
    recency: 2,
    updated: "4h ago",
  },
  {
    id: "neet-jee",
    question: "NEET UG or JEE Advanced — which is genuinely harder?",
    cat: "exams",
    place: "india",
    status: "Live",
    summary:
      "One rewards precision under volume, the other rewards depth under time. Every aspirant is certain it is theirs.",
    about:
      "A comparison of the two largest undergraduate entrance examinations on difficulty rather than prestige: NEET's breadth and negative-marking pressure against JEE Advanced's depth and multi-step problems.",
    tags: ["neet", "jee advanced", "entrance exams", "difficulty"],
    options: [
      {
        id: "a",
        name: "NEET UG",
        blurb: "180 questions, no second chances, and one silly error costs 4,000 ranks.",
        votes: 29840,
      },
      {
        id: "b",
        name: "JEE Advanced",
        blurb: "Fewer questions, each one built to break a memorised method.",
        votes: 33170,
      },
    ],
    closes: "Open-ended",
    trend: 95,
    recency: 1,
    updated: "45m ago",
  },
  {
    id: "metro-roads",
    question: "Metro expansion or road widening — where should the city budget go?",
    cat: "policies",
    place: "india",
    status: "Live",
    summary:
      "The same capital funds roughly 12 km of metro or 60 km of widened arterial road. One of them has to lose.",
    about:
      "A direct trade-off in urban transport capital spending. Metro carries far more people per rupee at peak but takes years and serves fixed corridors; road widening is faster and more visible, and a large body of evidence says it refills within three years.",
    tags: ["urban transport", "metro", "roads", "capital spending"],
    options: [
      {
        id: "a",
        name: "Metro expansion",
        blurb: "More people moved per rupee, permanently — if you can wait six years.",
        votes: 24980,
      },
      {
        id: "b",
        name: "Road widening",
        blurb: "Relief this year, on the routes people actually drive.",
        votes: 13640,
      },
    ],
    closes: "Open until 30 Aug 2026",
    trend: 86,
    recency: 3,
    updated: "7h ago",
  },
  {
    id: "tax-regime",
    question: "Old tax regime or new?",
    cat: "policies",
    place: "india",
    status: "Live",
    summary:
      "Lower rates and no deductions, against higher rates and every exemption you can document. It flips at a surprisingly low income.",
    about:
      "The new regime offers lower slab rates with almost no deductions; the old one keeps exemptions for housing, insurance and long-term savings. Which wins depends almost entirely on how much you claim, and most filers have never done the arithmetic.",
    tags: ["income tax", "deductions", "personal finance"],
    options: [
      {
        id: "a",
        name: "Old regime",
        blurb: "Worth the paperwork if you have a home loan and actually claim it.",
        votes: 16720,
      },
      {
        id: "b",
        name: "New regime",
        blurb: "Lower rates, no receipts, no April panic.",
        votes: 22410,
      },
    ],
    closes: "Open until 31 Jul 2026",
    trend: 84,
    recency: 3,
    updated: "9h ago",
  },
  {
    id: "chai-coffee",
    question: "Chai or coffee?",
    cat: "brands",
    place: "india",
    status: "Live",
    summary:
      "The least consequential poll on the platform and reliably the most voted. The regional split is the sharpest of anything here.",
    about:
      "A deliberately light poll that produces the sharpest geographic divide on OpinionHQ. Tamil Nadu and Karnataka answer it almost inversely to the north — filter coffee against three cups of chai a day — which is why the regional breakdown matters more than the headline number.",
    tags: ["chai", "coffee", "food and drink", "regional"],
    options: [
      {
        id: "a",
        name: "Chai",
        blurb: "Three times a day, and the fourth one is for company.",
        votes: 41230,
      },
      {
        id: "b",
        name: "Coffee",
        blurb: "Filter, in a steel tumbler, before anyone speaks to you.",
        votes: 28940,
      },
    ],
    history: [
      h("2026-03-01", [72, 28]),
      h("2026-04-05", [71, 29]),
      h("2026-05-10", [69, 31], "Third-wave chains cross 4,000 outlets nationally"),
      h("2026-06-14", [68, 32]),
      h("2026-07-19", [67, 33]),
      h("2026-08-01", [68, 32]),
    ],
    closes: "Open-ended",
    // Filter-coffee country really does answer this the other way round.
    trend: 93,
    recency: 2,
    updated: "1h ago",
  },
  {
    id: "t20-test",
    question: "T20 or Test cricket?",
    cat: "sports",
    place: "worldwide",
    status: "Live",
    summary:
      "Boards fund one and revere the other. Ask the people watching which they would keep and the answer is not obvious.",
    about:
      "T20 pays for the sport and fills the stadiums; Test cricket is where careers are still judged. With a crowded calendar forcing choices about which format gets the best players, this trade-off is now an administrative question rather than a philosophical one.",
    tags: ["cricket", "test cricket", "t20", "calendar"],
    options: [
      {
        id: "a",
        name: "T20",
        blurb: "Three hours, a result, and a full house on a weekday.",
        votes: 17840,
      },
      {
        id: "b",
        name: "Test cricket",
        blurb: "Five days to find out who can actually play.",
        votes: 25610,
      },
    ],
    closes: "Open-ended",
    trend: 89,
    recency: 3,
    updated: "6h ago",
  },
  {
    id: "cook-order",
    question: "Cook at home, or order in?",
    cat: "food",
    place: "india",
    status: "Live",
    summary:
      "Delivery fees have climbed far enough that the arithmetic has genuinely changed for a weeknight dinner.",
    about:
      "A weeknight dinner for two, cooked from ingredients you already partly have, against the same meal ordered once fees and packaging are added. The answer depends heavily on how much you value forty minutes.",
    tags: ["cooking", "delivery", "weeknight", "budget"],
    options: [
      {
        id: "a",
        name: "Cook at home",
        blurb: "A third of the price, and you know what went in it.",
        votes: 26840,
      },
      {
        id: "b",
        name: "Order in",
        blurb: "Forty minutes of your evening back, and nothing to wash up.",
        votes: 19310,
      },
    ],
    closes: "Open-ended",
    trend: 91,
    recency: 2,
    updated: "2h ago",
  },
  {
    id: "biryani-style",
    question: "Hyderabadi or Lucknowi biryani?",
    cat: "food",
    place: "india",
    status: "Live",
    summary:
      "Kacchi and fiery against slow-cooked and delicate. The most cheerfully unwinnable argument in Indian food.",
    about:
      "Two distinct traditions rather than two versions of one dish: Hyderabadi dum layers raw marinated meat under rice and cooks them together hot and spiced; Lucknowi pakki cooks them separately and aims for restraint. Nobody has ever conceded this argument.",
    tags: ["biryani", "hyderabadi", "lucknowi", "regional food"],
    options: [
      {
        id: "a",
        name: "Hyderabadi",
        blurb: "Heat, mirchi ka salan, and rice that fought for its flavour.",
        votes: 31470,
      },
      {
        id: "b",
        name: "Lucknowi",
        blurb: "Subtle, perfumed, and it does not need to shout.",
        votes: 24160,
      },
    ],
    closes: "Open-ended",
    trend: 94,
    recency: 1,
    updated: "25m ago",
  },

  /* ------------------------------------------ three and four options */
  {
    id: "first-language",
    question: "What should a first-year student learn first?",
    cat: "careers",
    place: "india",
    status: "Live",
    summary:
      "Three defensible answers, and the argument is really about what a beginner should be protected from.",
    about:
      "The disagreement is rarely about the language itself. Python advocates want the first win to arrive quickly; C advocates want the machine visible before the abstractions arrive; JavaScript advocates want the student to be able to show somebody the thing they built. All three produce working engineers.",
    tags: ["programming", "curriculum", "beginners", "cs"],
    options: [
      {
        id: "a",
        name: "Python",
        blurb: "The shortest path from nothing to a program that does something.",
        votes: 18240,
      },
      {
        id: "b",
        name: "C",
        blurb: "Learn what a pointer is before a framework hides it from you.",
        votes: 11930,
      },
      {
        id: "c",
        name: "JavaScript",
        blurb: "Build something you can send to your family on day two.",
        votes: 9410,
      },
    ],
    closes: "Open-ended",
    trend: 88,
    recency: 2,
    updated: "1h ago",
  },
  {
    id: "work-setup",
    question: "What working arrangement would you actually choose?",
    cat: "careers",
    place: "india",
    status: "Live",
    summary:
      "Four options, because the real argument was never remote against office — it is which days, and who decides.",
    about:
      "Most return-to-office debates collapse two separate questions into one: how often you are in, and whether that is your call or your employer's. Splitting the answer four ways separates people who want flexibility from people who want structure, and those are not the same camp.",
    tags: ["remote work", "hybrid", "office", "flexibility"],
    options: [
      {
        id: "a",
        name: "Fully remote",
        blurb: "No commute, no compromise, and the office is wherever you are.",
        votes: 14620,
      },
      {
        id: "b",
        name: "Hybrid, your days",
        blurb: "In when it helps, out when it does not, decided by you.",
        votes: 21380,
      },
      {
        id: "c",
        name: "Hybrid, fixed days",
        blurb: "Everyone in on the same days, so being in is actually worth it.",
        votes: 9740,
      },
      {
        id: "d",
        name: "Fully in-office",
        blurb: "One place, one team, and work that stops at the door.",
        votes: 5910,
      },
    ],
    history: [
      h("2026-02-01", [34, 33, 20, 13]),
      h("2026-03-08", [33, 35, 19, 13]),
      h("2026-04-12", [31, 37, 19, 13], "Return-to-office mandates cluster in Q2"),
      h("2026-05-17", [30, 39, 19, 12]),
      h("2026-06-21", [29, 40, 19, 12]),
      h("2026-07-26", [28, 41, 19, 12]),
      h("2026-08-01", [28, 41, 19, 12]),
    ],
    closes: "Open until 30 Sep 2026",
    trend: 91,
    recency: 1,
    updated: "35m ago",
  },

  /* ------------------------------------------------------- Approval ratings

     NAMED REAL INDIVIDUALS, WITH INVENTED NUMBERS.

     The topics file states the opposite policy — it frames political subjects
     by office rather than by name, precisely because invented approval figures
     against a named person read as real polling. That decision was overridden
     here deliberately, because approval tracking is the thing this chart type
     exists for and an anonymised version of it demonstrates nothing.

     Two rules make it survivable, and both must hold for anything added below:

       1. Every event label is procedural — a session, a budget, a result, a
          reshuffle. Never an allegation, never a scandal, never anything a
          named living person could be defamed by. The numbers are invented;
          the *claims about people* must not be.
       2. Both sides of the argument appear. A set of approval polls covering
          one party would be a statement in itself, whatever the numbers said.

     These carry an extra on-screen warning beyond the standard sample-data
     badge. If this ships anywhere real, these six rows are the first thing to
     delete. */
  {
    id: "approval-modi",
    question: "Narendra Modi as Prime Minister: approve or disapprove?",
    cat: "politicians",
    place: "india",
    status: "Ongoing",
    summary:
      "The office with the widest reach in the country, tracked as a straight approve/disapprove.",
    about:
      "An approval reading is not a voting intention. It asks whether you approve of how somebody is doing the job they currently hold, which is a different question from who you would vote for — people routinely approve of a leader and vote for somebody else, and the reverse.",
    tags: ["prime minister", "approval", "national politics", "governance"],
    options: [
      { id: "a", name: "Approve", blurb: "Approve of how the job is being done.", votes: 48210 },
      { id: "b", name: "Disapprove", blurb: "Do not approve of how the job is being done.", votes: 36940 },
    ],
    history: [
      h("2026-01-05", [59, 41]),
      h("2026-02-02", [58, 42], "Union Budget presented"),
      h("2026-03-02", [56, 44]),
      h("2026-04-06", [55, 45]),
      h("2026-05-04", [57, 43], "State assembly results in four states"),
      h("2026-06-01", [58, 42]),
      h("2026-07-06", [57, 43], "Monsoon session begins"),
      h("2026-08-01", [57, 43]),
    ],
    closes: "Open-ended",
    trend: 97,
    recency: 1,
    updated: "12m ago",
  },
  {
    id: "approval-rahul-gandhi",
    question: "Rahul Gandhi as Leader of the Opposition: approve or disapprove?",
    cat: "politicians",
    place: "india",
    status: "Ongoing",
    summary:
      "Opposition leadership is judged on a different job description — scrutiny rather than delivery.",
    about:
      "Approval of an opposition leader measures something narrower than approval of a government: whether the person is doing the job of holding it to account well. Readings for the two are not comparable, and stacking them side by side is the most common way this number gets misread.",
    tags: ["opposition", "approval", "parliament", "national politics"],
    options: [
      { id: "a", name: "Approve", blurb: "Approve of how the job is being done.", votes: 29480 },
      { id: "b", name: "Disapprove", blurb: "Do not approve of how the job is being done.", votes: 31260 },
    ],
    history: [
      h("2026-01-05", [43, 57]),
      h("2026-02-02", [44, 56], "Union Budget presented"),
      h("2026-03-02", [46, 54]),
      h("2026-04-06", [48, 52]),
      h("2026-05-04", [46, 54], "State assembly results in four states"),
      h("2026-06-01", [47, 53]),
      h("2026-07-06", [48, 52], "Monsoon session begins"),
      h("2026-08-01", [48, 52]),
    ],
    closes: "Open-ended",
    trend: 92,
    recency: 1,
    updated: "38m ago",
  },
  {
    id: "approval-yogi-adityanath",
    question: "Yogi Adityanath as Chief Minister of Uttar Pradesh: approve or disapprove?",
    cat: "politicians",
    place: "uttar-pradesh",
    status: "Ongoing",
    summary:
      "The largest state in the country by population, and the approval reading that moves the most on local news.",
    about:
      "State-level approval tends to track visible administration — roads, power, law and order, exam conduct — far more closely than national approval does. Readings here are heavily weighted toward respondents in the state itself.",
    tags: ["uttar pradesh", "chief minister", "approval", "state politics"],
    options: [
      { id: "a", name: "Approve", blurb: "Approve of how the job is being done.", votes: 26310 },
      { id: "b", name: "Disapprove", blurb: "Do not approve of how the job is being done.", votes: 19870 },
    ],
    history: [
      h("2026-01-05", [61, 39]),
      h("2026-02-02", [60, 40]),
      h("2026-03-02", [58, 42], "State budget session"),
      h("2026-04-06", [57, 43]),
      h("2026-05-04", [58, 42]),
      h("2026-06-01", [57, 43], "Board exam results published"),
      h("2026-07-06", [57, 43]),
      h("2026-08-01", [57, 43]),
    ],
    closes: "Open-ended",
    trend: 88,
    recency: 2,
    updated: "1h ago",
  },
  {
    id: "approval-mamata-banerjee",
    question: "Mamata Banerjee as Chief Minister of West Bengal: approve or disapprove?",
    cat: "politicians",
    place: "west-bengal",
    status: "Ongoing",
    summary:
      "Three terms in, and an approval reading that has stayed unusually stable through them.",
    about:
      "Long-tenure approval readings drift less than first-term ones: most respondents formed a view years ago and events move them slowly. The interesting movement in a series like this is usually in who is still undecided rather than in who has switched.",
    tags: ["west bengal", "chief minister", "approval", "state politics"],
    options: [
      { id: "a", name: "Approve", blurb: "Approve of how the job is being done.", votes: 21740 },
      { id: "b", name: "Disapprove", blurb: "Do not approve of how the job is being done.", votes: 18960 },
    ],
    history: [
      h("2026-01-05", [55, 45]),
      h("2026-02-02", [54, 46]),
      h("2026-03-02", [53, 47], "State budget session"),
      h("2026-04-06", [54, 46]),
      h("2026-05-04", [53, 47]),
      h("2026-06-01", [53, 47]),
      h("2026-07-06", [54, 46], "Panchayat funding allocation announced"),
      h("2026-08-01", [53, 47]),
    ],
    closes: "Open-ended",
    trend: 84,
    recency: 2,
    updated: "2h ago",
  },
  {
    id: "approval-stalin",
    question: "M. K. Stalin as Chief Minister of Tamil Nadu: approve or disapprove?",
    cat: "politicians",
    place: "tamil-nadu",
    status: "Ongoing",
    summary:
      "A state where the approval question and the voting question come apart more than most.",
    about:
      "Tamil Nadu is a useful illustration of why approval and voting intention should never be reported as the same number: the state has a long record of approving of an incumbent's administration while the vote itself turns on alliance arithmetic.",
    tags: ["tamil nadu", "chief minister", "approval", "state politics"],
    options: [
      { id: "a", name: "Approve", blurb: "Approve of how the job is being done.", votes: 23480 },
      { id: "b", name: "Disapprove", blurb: "Do not approve of how the job is being done.", votes: 15220 },
    ],
    history: [
      h("2026-01-05", [58, 42]),
      h("2026-02-02", [59, 41]),
      h("2026-03-02", [60, 40], "State budget session"),
      h("2026-04-06", [61, 39]),
      h("2026-05-04", [60, 40]),
      h("2026-06-01", [61, 39], "Monsoon relief allocation announced"),
      h("2026-07-06", [60, 40]),
      h("2026-08-01", [61, 39]),
    ],
    closes: "Open-ended",
    trend: 81,
    recency: 2,
    updated: "3h ago",
  },
  {
    id: "approval-kejriwal",
    question: "Arvind Kejriwal as a national political figure: approve or disapprove?",
    cat: "politicians",
    place: "india",
    status: "Ongoing",
    summary:
      "A reading of standing rather than of office — and the one most likely to be misread as either.",
    about:
      "Approval of a figure without a current national office measures general standing, not performance in a job. It is included here because people ask the question, and excluded from any comparison with the office-holder readings above, which are answering something else entirely.",
    tags: ["approval", "national politics", "party leadership"],
    options: [
      { id: "a", name: "Approve", blurb: "Approve of how they conduct themselves publicly.", votes: 18640 },
      { id: "b", name: "Disapprove", blurb: "Do not approve of how they conduct themselves publicly.", votes: 20910 },
    ],
    history: [
      h("2026-01-05", [49, 51]),
      h("2026-02-02", [48, 52]),
      h("2026-03-02", [47, 53]),
      h("2026-04-06", [46, 54], "Party organisational restructure announced"),
      h("2026-05-04", [47, 53], "State assembly results in four states"),
      h("2026-06-01", [47, 53]),
      h("2026-07-06", [47, 53]),
      h("2026-08-01", [47, 53]),
    ],
    closes: "Open-ended",
    trend: 78,
    recency: 3,
    updated: "5h ago",
  },
];

export const POLLS_BY_ID: ReadonlyMap<string, Poll> = new Map(
  POLLS.map((p) => [p.id, p]),
);
