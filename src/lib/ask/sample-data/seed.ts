/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Invented people, invented credentials, invented questions and answers. Real
 * technologies, exams and kinds of institution are used so the matching rules
 * can be reviewed against realistic input; nothing here describes an actual
 * person.
 *
 * Two things this file exists to demonstrate:
 *
 *  1. Proof is per area. `p-arjun` was verified separately for careers and for
 *     colleges. `p-aarav` is a verified engineer and is therefore not a
 *     candidate on a college or exam question at all.
 *
 *  2. Two answers on the same question disagree. Second opinions that always
 *     agree are not second opinions, and the compare view has nothing to show.
 *
 * Loaded only into the browser of somebody signed in, and keyed to that visitor
 * as the asker. Nothing in `lib/topics.ts` or `lib/polls.ts` imports it.
 */

import { verify } from "@/lib/ask/verification";
import type {
  Answer,
  AnswerComment,
  Credential,
  Match,
  Message,
  AskQuestion,
  Professional,
  Thread,
} from "@/lib/ask/types";

/** The signed-in visitor. Fixtures address them by this id. */
export const SELF_USER_ID = "you";

export const PROFESSIONALS: Professional[] = [
  {
    userId: "p-ananya",
    name: "Ananya Krishnan",
    initials: "AK",
    headline: "Data Scientist, Fintech",
    tone: "#4ED27C",
    expertise: ["data", "analytics", "python", "machine learning", "sql"],
    areas: ["career"],
    answered: 18,
    helpfulPct: 89,
    simulated: true,
  },
  {
    userId: "p-farhan",
    name: "Farhan Qureshi",
    initials: "FQ",
    headline: "Product Manager, B2B SaaS",
    tone: "#F0A83C",
    expertise: ["product", "management", "b2b", "strategy", "mba"],
    areas: ["career"],
    answered: 31,
    helpfulPct: 86,
    simulated: true,
  },
  {
    userId: "p-ishita",
    name: "Ishita Bose",
    initials: "IB",
    headline: "Placement Cell Coordinator, NIT",
    tone: "#A78BFA",
    expertise: ["placements", "engineering", "nit", "campus", "internships"],
    areas: ["college"],
    answered: 27,
    helpfulPct: 92,
    simulated: true,
  },
  {
    userId: "p-devansh",
    name: "Devansh Rathi",
    initials: "DR",
    headline: "GATE AIR 112, IISc M.Tech",
    tone: "#5AA9F0",
    expertise: ["gate", "iisc", "mtech", "preparation", "engineering"],
    areas: ["exam"],
    answered: 22,
    helpfulPct: 90,
    simulated: true,
  },
  {
    userId: "p-shreya",
    name: "Shreya Pillai",
    initials: "SP",
    headline: "Chartered Accountant, Big Four",
    tone: "#8FA8C4",
    expertise: ["ca", "finance", "audit", "articleship", "accounting"],
    areas: ["career", "exam"],
    answered: 35,
    helpfulPct: 87,
    simulated: true,
  },
  {
    userId: "p-aarav",
    name: "Aarav Mehta",
    initials: "AM",
    headline: "Senior Software Engineer",
    tone: "#5AA9F0",
    expertise: ["frontend", "react", "cloud", "platform", "typescript"],
    areas: ["career"],
    answered: 24,
    helpfulPct: 91,
    simulated: true,
  },
  {
    userId: "p-divya",
    name: "Divya Raghunathan",
    initials: "DR",
    headline: "Engineering Manager, Platform",
    tone: "#8FA8C4",
    expertise: ["platform", "backend", "devops", "hiring", "kubernetes"],
    areas: ["career"],
    answered: 41,
    helpfulPct: 88,
    simulated: true,
  },
  {
    userId: "p-kabir",
    name: "Kabir Anand",
    initials: "KA",
    headline: "Technical Recruiter",
    tone: "#C7A55B",
    expertise: ["hiring", "offer", "interview", "resume", "negotiation"],
    areas: ["career"],
    answered: 63,
    helpfulPct: 84,
    simulated: true,
  },
  {
    userId: "p-meera",
    name: "Meera Iyer",
    initials: "MI",
    headline: "Product Manager · MBA",
    tone: "#A78BFA",
    expertise: ["product", "mba", "career switch", "strategy"],
    areas: ["career"],
    answered: 18,
    helpfulPct: 93,
    simulated: true,
  },
  {
    // Verified separately in two areas, which is the only way to hold two.
    userId: "p-arjun",
    name: "Arjun Pillai",
    initials: "AP",
    headline: "Backend Engineer · NIT alumnus",
    tone: "#63C57E",
    expertise: ["backend", "java", "placements", "cse", "distributed systems"],
    areas: ["career", "college"],
    answered: 12,
    helpfulPct: 90,
    simulated: true,
  },
  {
    userId: "p-rohan",
    name: "Rohan Deshmukh",
    initials: "RD",
    headline: "Final-year CSE student",
    tone: "#5AA9F0",
    expertise: ["cse", "campus", "placements", "hostel", "coursework"],
    areas: ["college"],
    answered: 9,
    helpfulPct: 79,
    simulated: true,
  },
  {
    userId: "p-sneha",
    name: "Sneha Balakrishnan",
    initials: "SB",
    headline: "BITS alumna · ex-placement rep",
    tone: "#F0A83C",
    expertise: ["ece", "placements", "fees", "bits", "electronics"],
    areas: ["college"],
    answered: 31,
    helpfulPct: 87,
    simulated: true,
  },
  {
    userId: "p-vikram",
    name: "Vikram Nair",
    initials: "VN",
    headline: "CAT 99.4 percentile · IIM admit",
    tone: "#A78BFA",
    expertise: ["cat", "quant", "mocks", "percentile", "working professional"],
    areas: ["exam"],
    answered: 27,
    helpfulPct: 92,
    simulated: true,
  },
  {
    userId: "p-tanvi",
    name: "Tanvi Sharma",
    initials: "TS",
    headline: "GATE CS AIR 212 · mentor",
    tone: "#63C57E",
    expertise: ["gate", "algorithms", "operating systems", "rank", "cs"],
    areas: ["exam"],
    answered: 22,
    helpfulPct: 89,
    simulated: true,
  },
  {
    // Below the reporting threshold on purpose: "100% helpful" off three
    // answers is not a statistic, and the card withholds it.
    userId: "p-nikhil",
    name: "Nikhil Verma",
    initials: "NV",
    headline: "DevOps Engineer",
    tone: "#8FA8C4",
    expertise: ["devops", "kubernetes", "terraform", "cloud", "sre"],
    areas: ["career"],
    answered: 3,
    helpfulPct: 100,
    simulated: true,
  },
];

/**
 * Credentials, built through `verify()` so the published label and evidence
 * class can never drift from the catalog in `verification.ts`.
 */
export const CREDENTIALS: Credential[] = [
  ...verify("p-aarav", "career", ["employment", "portfolio"], "2026-04-12T09:00:00.000Z"),
  ...verify("p-divya", "career", ["employment", "experience-letter", "linkedin"], "2026-03-02T09:00:00.000Z"),
  ...verify("p-kabir", "career", ["employment", "linkedin"], "2026-05-19T09:00:00.000Z"),
  ...verify("p-meera", "career", ["employment", "linkedin"], "2026-02-11T09:00:00.000Z"),
  // Two areas, reviewed one at a time.
  ...verify("p-arjun", "career", ["employment"], "2026-04-04T09:00:00.000Z"),
  ...verify("p-arjun", "college", ["degree", "alumni"], "2026-04-04T09:00:00.000Z"),
  ...verify("p-rohan", "college", ["student-id"], "2026-06-08T09:00:00.000Z"),
  ...verify("p-sneha", "college", ["degree", "alumni"], "2026-01-26T09:00:00.000Z"),
  ...verify("p-vikram", "exam", ["scorecard", "admission-letter"], "2026-03-15T09:00:00.000Z"),
  ...verify("p-tanvi", "exam", ["rank-card"], "2026-05-30T09:00:00.000Z"),
  ...verify("p-nikhil", "career", ["employment"], "2026-07-01T09:00:00.000Z"),
  ...verify("p-ananya", "career", ["employment", "portfolio"], "2026-05-08T09:00:00.000Z"),
  ...verify("p-farhan", "career", ["employment", "experience-letter"], "2026-04-21T09:00:00.000Z"),
  ...verify("p-ishita", "college", ["employment", "alumni"], "2026-02-27T09:00:00.000Z"),
  ...verify("p-devansh", "exam", ["rank-card", "admission-letter"], "2026-06-15T09:00:00.000Z"),
  // Two areas: the qualification proves the exam, the job proves the career.
  ...verify("p-shreya", "exam", ["scorecard"], "2026-03-09T09:00:00.000Z"),
  ...verify("p-shreya", "career", ["employment"], "2026-03-09T09:00:00.000Z"),
];

/* ---------------------------------------------------- the visitor's asks */

export const SELF_QUESTIONS: AskQuestion[] = [
  {
    id: "q-offer",
    askerUserId: SELF_USER_ID,
    askerName: "You",
    // Seeded private on purpose, so the prototype shows both modes without
    // anyone having to create a question first. It is also the right call for
    // this one: a named employer, an unwritten promotion promise and a live
    // offer are exactly what the private option exists for.
    visibility: "private",
    category: "career",
    place: "bengaluru",
    title: "Should I take the platform role, or stay one more promotion cycle?",
    context:
      "Three and a half years at my current company, all of it on a product team writing React and Node. An offer came in last week for a platform role — internal tooling, Kubernetes, developer experience — at roughly a 30% raise. My manager has told me informally that I am on the list for the March senior cycle, but nothing is in writing.\n\nI have never worked on infrastructure professionally and I am not sure whether I would be starting over or building on what I have. I want to be a senior IC within two years, somewhere the systems work is real. Notice period is 60 days and the offer expires in two weeks.",
    options: ["Take the platform role", "Stay for the March cycle"],
    deadline: "2026-08-14",
    createdAt: "2026-07-24T08:12:00.000Z",
    updatedAt: "2026-07-30T15:40:00.000Z",
    simulated: true,
  },
  {
    id: "q-college",
    askerUserId: SELF_USER_ID,
    askerName: "You",
    visibility: "public",
    category: "college",
    place: "india",
    title: "NIT Trichy CSE or BITS Pilani ECE, for someone who wants to write software?",
    context:
      "My younger sister has both. She is clear that she wants to end up in software, but the ECE seat is at the college she liked more on the campus visit. The fee difference over four years is substantial for us and nobody in the family has been through either system, so we are working entirely off what we can read online.",
    options: ["NIT Trichy — CSE", "BITS Pilani — ECE"],
    deadline: "2026-08-08",
    createdAt: "2026-07-21T06:45:00.000Z",
    updatedAt: "2026-07-29T18:20:00.000Z",
    simulated: true,
  },
  {
    id: "q-cat",
    askerUserId: SELF_USER_ID,
    askerName: "You",
    visibility: "public",
    category: "exam",
    place: "india",
    title: "Is 99+ in CAT realistic on twelve hours a week while working?",
    context:
      "Working a role that runs to about fifty hours most weeks. I can protect two hours on weekday mornings and most of Sunday. Started in June, currently at 88 percentile on sectional mocks with quant clearly the weak section. Target is a top-six call, and I cannot cut my working hours before October.",
    options: ["Attempt this November", "Postpone a year and prepare properly"],
    deadline: "2026-08-20",
    createdAt: "2026-07-29T04:15:00.000Z",
    updatedAt: "2026-07-30T07:00:00.000Z",
    simulated: true,
  },
];

export const SELF_MATCHES: Match[] = [
  {
    id: "m-q-offer-p-aarav",
    questionId: "q-offer",
    professionalUserId: "p-aarav",
    reasons: [
      "Verified in career: current employment verified",
      "Works with platform, cloud",
    ],
    matchedAt: "2026-07-24T08:20:00.000Z",
  },
  {
    id: "m-q-offer-p-divya",
    questionId: "q-offer",
    professionalUserId: "p-divya",
    reasons: [
      "Verified in career on 3 counts",
      "Works with platform, backend",
    ],
    matchedAt: "2026-07-24T08:20:00.000Z",
  },
  {
    id: "m-q-offer-p-kabir",
    questionId: "q-offer",
    professionalUserId: "p-kabir",
    reasons: ["Verified in career on 2 counts", "Works with offer, hiring"],
    matchedAt: "2026-07-24T08:20:00.000Z",
  },
  {
    id: "m-q-college-p-rohan",
    questionId: "q-college",
    professionalUserId: "p-rohan",
    reasons: ["Verified in college: current student verified", "Works with cse, placements"],
    matchedAt: "2026-07-21T06:50:00.000Z",
  },
  {
    id: "m-q-college-p-sneha",
    questionId: "q-college",
    professionalUserId: "p-sneha",
    reasons: ["Verified in college on 2 counts", "Works with ece, placements, bits"],
    matchedAt: "2026-07-21T06:50:00.000Z",
  },
  {
    id: "m-q-cat-p-vikram",
    questionId: "q-cat",
    professionalUserId: "p-vikram",
    reasons: ["Verified in exam on 2 counts", "Works with cat, mocks"],
    matchedAt: "2026-07-29T04:20:00.000Z",
  },
];

export const SELF_ANSWERS: Answer[] = [
  {
    id: "a-q-offer-p-aarav",
    questionId: "q-offer",
    professionalUserId: "p-aarav",
    verdicts: [3, 2],
    pick: 0,
    summary: "Worth taking, but expect the first six months to feel like a step back.",
    reasoning:
      "I made close to this exact move three years ago, from product work into platform. The part nobody tells you is that your product instincts are the transferable asset, not your stack knowledge — you will be the only person on that team who has been the customer. The Kubernetes side is learnable in about two quarters if you are deliberate about it.\n\nOn the promotion cycle: an informal mention is not a plan. I have watched three colleagues wait out a cycle on a verbal indication and be told the band was full.",
    nextSteps: [
      "Ask how many engineers are on the platform team now, and how many a year ago",
      "Ask what fraction of their quarter goes to unplanned work",
      "Ask your manager to put the March cycle in writing — the answer tells you a lot either way",
    ],
    createdAt: "2026-07-25T06:30:00.000Z",
    updatedAt: "2026-07-30T15:40:00.000Z",
  },
  {
    id: "a-q-offer-p-divya",
    questionId: "q-offer",
    professionalUserId: "p-divya",
    verdicts: [1, 3],
    pick: 1,
    summary: "I would not take this one. The role is right; this particular offer is not.",
    reasoning:
      "I run a platform team and hire for exactly this profile, so read this as the view from the other chair. Moving from product to platform with no infrastructure background is normal and we do it regularly — but almost always at the same level, not with a 30% raise attached.\n\nA large raise into a function you have not worked in usually means one of two things: the level is lower than the number suggests, or the team is struggling to hire and has been told to pay up. Both are worth knowing before you sign.",
    nextSteps: [
      "Get the level and the band in writing before anything else",
      "Ask how many people left that team in the last twelve months",
      "Treat a vague answer from your current manager as an answer",
    ],
    createdAt: "2026-07-26T11:10:00.000Z",
    updatedAt: "2026-07-26T11:10:00.000Z",
  },
  {
    id: "a-q-college-p-rohan",
    questionId: "q-college",
    professionalUserId: "p-rohan",
    verdicts: [4, 1],
    pick: 0,
    summary: "For a software career, CSE at Trichy is the straightforward answer.",
    reasoning:
      "I am in my final year of exactly this programme. The honest picture: the coursework is good but not the reason to come — the reason is that software companies visiting campus interview CSE first and often close their numbers before other branches open. That is structural and has nothing to do with how good anyone is.\n\nHostels are basic and the food is a running joke, but the peer group is the real asset.",
    nextSteps: [
      "Look at which companies interviewed which branches first in the last two seasons",
      "Speak to someone who graduated two years ago, not someone still on campus",
    ],
    createdAt: "2026-07-23T09:20:00.000Z",
    updatedAt: "2026-07-23T09:20:00.000Z",
    likes: 31,
    dislikes: 6,
  },
  {
    id: "a-q-college-p-sneha",
    questionId: "q-college",
    professionalUserId: "p-sneha",
    verdicts: [3, 3],
    pick: 1,
    summary: "Both work. If she liked the campus more, that is a real input and I would not dismiss it.",
    reasoning:
      "I did ECE at Pilani and sat on the placement side for a year, so I have seen both the brochure and the sheet. Rohan is right that CSE gets interviewed first — that part is not in dispute. Where I disagree is how much it decides.\n\nECE students here do get software roles, a good number every year, but they get them by building something outside the curriculum from second year onward. If she will do that, the branch gap closes and the flexibility of this system is worth real money to somebody who might change her mind at nineteen. If she will not, take the CSE seat.\n\nOn fees, I would be straight: the premium is defensible for the flexibility and the culture. It is not defensible on software placement outcomes alone.",
    nextSteps: [
      "Ask what fraction of ECE took software roles, not what fraction was placed",
      "If she picks ECE, treat first year as the time to start, not to settle in",
    ],
    createdAt: "2026-07-24T14:05:00.000Z",
    updatedAt: "2026-07-24T14:05:00.000Z",
    likes: 46,
    dislikes: 4,
  },
];

/**
 * Threads.
 *
 * Note which of these carry `privateOpenedAt`: only the two the asker actually
 * took private. The rest are answered or waiting with the private channel still
 * shut, which is the ordinary case and the one worth showing — an answer you
 * read and did not need to follow up on.
 */
export const SELF_THREADS: Thread[] = [
  {
    questionId: "q-offer",
    professionalUserId: "p-aarav",
    status: "In discussion",
    privateOpenedAt: "2026-07-29T07:38:00.000Z",
    updatedAt: "2026-07-30T15:40:00.000Z",
  },
  {
    questionId: "q-offer",
    professionalUserId: "p-divya",
    status: "Answered",
    updatedAt: "2026-07-26T11:10:00.000Z",
  },
  {
    questionId: "q-offer",
    professionalUserId: "p-kabir",
    status: "Awaiting answer",
    updatedAt: "2026-07-24T08:20:00.000Z",
  },
  {
    questionId: "q-college",
    professionalUserId: "p-rohan",
    status: "Answered",
    updatedAt: "2026-07-23T09:20:00.000Z",
  },
  {
    questionId: "q-college",
    professionalUserId: "p-sneha",
    status: "In discussion",
    privateOpenedAt: "2026-07-28T16:05:00.000Z",
    updatedAt: "2026-07-29T18:20:00.000Z",
  },
  {
    questionId: "q-cat",
    professionalUserId: "p-vikram",
    status: "Awaiting answer",
    updatedAt: "2026-07-30T06:55:00.000Z",
  },
];

export const SELF_MESSAGES: Message[] = [
  {
    id: "msg-1",
    questionId: "q-offer",
    professionalUserId: "p-aarav",
    senderUserId: SELF_USER_ID,
    senderRole: "asker",
    body: "The platform team is six engineers, up from four last year. They said roughly a third of the quarter goes to unplanned work. Does that change anything?",
    createdAt: "2026-07-29T07:40:00.000Z",
  },
  {
    id: "msg-2",
    questionId: "q-offer",
    professionalUserId: "p-aarav",
    senderUserId: "p-aarav",
    senderRole: "professional",
    body: "Six and growing is a healthy sign, and a third unplanned is on the good side of normal for platform. I would move my risk read from moderate to low-moderate on the strength of that. The level question is still the one I would not sign without.",
    createdAt: "2026-07-30T15:40:00.000Z",
  },
  {
    id: "msg-3",
    questionId: "q-college",
    professionalUserId: "p-sneha",
    senderUserId: SELF_USER_ID,
    senderRole: "asker",
    body: "That is the first straight answer we have had on the fees. If she does take ECE, what specifically should she be doing in the first year?",
    createdAt: "2026-07-28T16:10:00.000Z",
  },
  {
    id: "msg-4",
    questionId: "q-college",
    professionalUserId: "p-sneha",
    senderUserId: "p-sneha",
    senderRole: "professional",
    body: "One language properly rather than three badly, and one project that runs somewhere other than her laptop. Then a club that ships things — the students who did that were interviewing on equal terms with CSE by third year.",
    createdAt: "2026-07-29T18:20:00.000Z",
  },
];

/* ------------------------------------------------ questions for the visitor */

/**
 * Questions from other people, used to demonstrate the answering side.
 *
 * They reach the visitor only once they hold proof in the matching area — the
 * matcher runs live against whatever they actually verified, so proving
 * employment surfaces career questions and nothing else.
 */
export const INBOUND_QUESTIONS: AskQuestion[] = [
  {
    id: "iq-ca-articleship",
    askerUserId: "u-devika",
    askerName: "Devika R.",
    visibility: "public",
    category: "career",
    place: "mumbai",
    title: "Articleship at a Big Four, or at a mid-size firm where I would touch everything?",
    context:
      "I clear my CA Inter this month and have to pick where to do articleship. A Big Four office has offered me a place in their audit vertical. A well-regarded 40-person firm in the same city has offered me a generalist role — audit, tax, some advisory. Everybody around me says Big Four for the brand. The seniors I have actually spoken to say you audit one line item for three years.",
    options: ["Big Four audit", "Mid-size generalist firm"],
    deadline: "2026-09-05",
    createdAt: "2026-07-27T06:15:00.000Z",
    updatedAt: "2026-07-31T11:20:00.000Z",
    simulated: true,
  },
  {
    id: "iq-gate-vs-job",
    askerUserId: "u-harish",
    askerName: "Harish M.",
    visibility: "public",
    category: "exam",
    place: "india",
    title: "Final year, campus offer in hand — take it, or drop a year for GATE?",
    context:
      "Mechanical, tier-2 college, CGPA 8.4. I have a service company offer at 4.5 LPA. I want to end up in core mechanical work, ideally an M.Tech at IISc or an older IIT, and the campus offer is IT services, which is nowhere near that. Family is not in a position where I can be unemployed for a year without it being noticed, but they have said they will support one attempt.",
    options: ["Take the offer and prepare alongside", "Drop the year and prepare full time"],
    deadline: "2026-08-30",
    createdAt: "2026-07-29T04:40:00.000Z",
    updatedAt: "2026-08-01T09:10:00.000Z",
    simulated: true,
  },
  {
    id: "iq-data-switch",
    askerUserId: "u-sana",
    askerName: "Sana K.",
    visibility: "public",
    category: "career",
    place: "hyderabad",
    title: "Six years in business analysis — is a data science switch realistic without a masters?",
    context:
      "Six years writing SQL, building dashboards and doing requirement analysis for a retail client. I have done two online certifications in machine learning and one Kaggle competition that went nowhere. Every data science posting asks for a masters or three years of modelling experience. I do not want to spend twenty lakh on a degree if the switch is possible without one, and I am 29.",
    options: ["Switch internally into an analytics team", "Apply out as a data analyst first", "Do a masters"],
    deadline: "",
    createdAt: "2026-07-30T10:05:00.000Z",
    updatedAt: "2026-07-31T16:45:00.000Z",
    simulated: true,
  },
  {
    id: "iq-branch-vs-college",
    askerUserId: "u-pranit",
    askerName: "Pranit S.",
    visibility: "public",
    category: "college",
    place: "tamil-nadu",
    title: "CSE at a newer NIT, or Mechanical at an older one?",
    context:
      "My rank gives me CSE at one of the 2010-onwards NITs, or Mechanical at an NIT that has been around since the sixties. Everybody in my family is telling me the older institute name matters for life. Everybody on the internet is telling me branch is everything and mechanical placements are thin. I genuinely do not know which group is fooling itself.",
    options: ["CSE at the newer NIT", "Mechanical at the older NIT"],
    deadline: "2026-08-18",
    createdAt: "2026-07-31T07:25:00.000Z",
    updatedAt: "2026-08-01T13:30:00.000Z",
    simulated: true,
  },
  {
    id: "iq-devops",
    askerUserId: "u-priya",
    askerName: "Priya S.",
    visibility: "public",
    category: "career",
    place: "bengaluru",
    title: "Moving from QA into DevOps at 28 — is it too late to switch tracks?",
    context:
      "Five years in manual and automation testing. I have been doing the CI pipeline work on my team informally for about a year and I enjoy it far more than the testing itself. Every job description wants three years of DevOps experience and I do not know how to get past that. Single income household, so I cannot take more than a small pay cut.",
    options: ["Push for an internal move", "Apply out and take a level cut", "Certify first"],
    deadline: "2026-09-15",
    createdAt: "2026-07-30T05:20:00.000Z",
    updatedAt: "2026-07-30T05:20:00.000Z",
    simulated: true,
  },
  {
    id: "iq-branch",
    askerUserId: "u-arun",
    askerName: "Arun K.",
    visibility: "public",
    category: "college",
    place: "india",
    title: "Mechanical at a better-known college, or CSE at a less-known one?",
    context:
      "My rank gives me mechanical at a college everybody has heard of, or CSE at one nobody outside the state has. Family strongly prefers the first. I want to write software. Counselling closes in ten days.",
    options: ["Mechanical at the known college", "CSE at the lesser-known one"],
    deadline: "2026-08-09",
    createdAt: "2026-07-29T13:00:00.000Z",
    updatedAt: "2026-07-29T13:00:00.000Z",
    simulated: true,
  },
  {
    id: "iq-gate",
    askerUserId: "u-fatima",
    askerName: "Fatima R.",
    visibility: "public",
    category: "exam",
    place: "india",
    title: "Third GATE attempt, or take the job offer in hand?",
    context:
      "Two attempts, best AIR just outside the range for the programmes I want. I have an offer from a service company starting in September and family is pushing me to take it. I think one more focused year gets me there, but I have thought that before.",
    options: ["Third attempt", "Take the offer and stop"],
    deadline: "2026-08-25",
    createdAt: "2026-07-28T09:45:00.000Z",
    updatedAt: "2026-07-28T09:45:00.000Z",
    simulated: true,
  },
];

/* ----------------------------------------- answers on the public questions

   The browse list needs to show something. A section whose front page is five
   questions all reading "no answers yet" demonstrates the routing and none of
   the value, so the four public questions above carry worked answers — two
   each, disagreeing, because two answers that agree are one answer twice. */
export const PUBLIC_ANSWERS: Answer[] = [
  {
    id: "a-iq-ca-p-shreya",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-shreya",
    verdicts: [3, 4],
    pick: 1,
    summary: "Take the mid-size firm. The brand is worth less than three years of range.",
    reasoning:
      "I did Big Four articleship and I would not do it again. You are staffed on one vertical, often one client, and for long stretches on one section of one client. What you learn is process discipline, which is real, and very little else.\n\nThe people I know who came out of good mid-size firms could scope an assignment on their own by their second year. That is the skill that determines what you can charge for later. The brand opens the first door; the range decides how far in you get.",
    nextSteps: [
      "Ask the mid-size firm how many assignments an article typically closes end to end",
      "Ask the Big Four office which vertical and which clients — a vague answer is the answer",
      "Talk to two people who finished articleship at each, not two who are still in it",
    ],
    createdAt: "2026-07-28T09:20:00.000Z",
    updatedAt: "2026-07-28T09:20:00.000Z",
    likes: 38,
    dislikes: 9,
  },
  {
    id: "a-iq-ca-p-farhan",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-farhan",
    verdicts: [4, 3],
    pick: 0,
    summary: "Take the Big Four. You can buy range later; you cannot retrofit the first line of a CV.",
    reasoning:
      "I am not a CA, so weigh this against the answer above. What I do know is what happens on the other side of a hiring table, and the first filter is almost always mechanical. A Big Four articleship clears that filter for the rest of your career, in industry as well as practice.\n\nThe narrowness is real and I would not argue with it. But three narrow years followed by a deliberate move is a recoverable position. The reverse — broad experience at a firm nobody recognises — needs somebody to actually read your CV, and often nobody does.",
    nextSteps: [
      "Find out whether the Big Four office rotates articles between verticals at all",
      "Ask both firms what their articles did immediately afterwards",
    ],
    createdAt: "2026-07-29T14:05:00.000Z",
    updatedAt: "2026-07-29T14:05:00.000Z",
    likes: 27,
    dislikes: 31,
  },
  {
    id: "a-iq-gate-p-devansh",
    questionId: "iq-gate-vs-job",
    professionalUserId: "p-devansh",
    verdicts: [2, 4],
    pick: 1,
    summary: "If IISc is genuinely the target, the year off is the honest way to get there.",
    reasoning:
      "I prepared alongside a job for one attempt and got a rank that opened nothing. I dropped the next year, prepared properly, and got AIR 112. The difference was not intelligence, it was six hours a day instead of ninety exhausted minutes.\n\nThe caveat matters though: a drop year is only worth it if you actually protect the time. Most people who drop end up doing about the same hours they would have managed anyway, and then have neither the rank nor the year.",
    nextSteps: [
      "Write down the rank you need for the specific departments you want, not for GATE in general",
      "Do a full-length paper this week under real conditions and see where you actually stand",
      "Agree with your family exactly what happens if the attempt does not work",
    ],
    createdAt: "2026-07-30T11:35:00.000Z",
    updatedAt: "2026-07-30T11:35:00.000Z",
    likes: 52,
    dislikes: 7,
  },
  {
    id: "a-iq-gate-p-tanvi",
    questionId: "iq-gate-vs-job",
    professionalUserId: "p-tanvi",
    verdicts: [4, 2],
    pick: 0,
    summary: "Take the offer. A funded year of preparation beats an unfunded one for most people.",
    reasoning:
      "I coach people through this every cycle and the drop-year advice is survivorship bias — you hear from the ones it worked for. The ones who lost the year and the offer do not post about it.\n\nTaking a service company role is not the end of the core ambition. The work is undemanding enough in the first year to protect two hours on weekdays and a full day at weekends, which is enough for a serious attempt if you are disciplined. And if the attempt fails you still have an income and a CV that has not got a hole in it.",
    nextSteps: [
      "Check the notice period and whether the offer allows a deferred joining date",
      "Block the study hours in a calendar before you join, not after",
    ],
    createdAt: "2026-07-31T08:50:00.000Z",
    updatedAt: "2026-07-31T08:50:00.000Z",
    likes: 19,
    dislikes: 22,
  },
  {
    id: "a-iq-data-p-ananya",
    questionId: "iq-data-switch",
    professionalUserId: "p-ananya",
    verdicts: [4, 3, 1],
    pick: 0,
    summary: "Switch internally. You already have the hardest part and are undervaluing it.",
    reasoning:
      "Six years of SQL against a real business is the thing most data science hires do not have and take two years to acquire. Domain knowledge plus data access is a stronger starting position than a masters with neither.\n\nThe internal route works because somebody already trusts you. Find the team in your own company that owns forecasting or pricing, and take them a piece of analysis nobody asked for. That is how three of the four people on my team arrived, none of them with a masters.",
    nextSteps: [
      "Identify which team in your company owns a model that touches revenue",
      "Build one analysis on your own data and send it to them unprompted",
      "Stop doing certifications — they are not what is blocking you",
    ],
    createdAt: "2026-07-31T06:10:00.000Z",
    updatedAt: "2026-07-31T06:10:00.000Z",
    likes: 41,
    dislikes: 5,
  },
  {
    id: "a-iq-data-p-divya",
    questionId: "iq-data-switch",
    professionalUserId: "p-divya",
    verdicts: [3, 4, 2],
    pick: 1,
    summary: "Apply out as an analyst first. Internal moves stall more often than people admit.",
    reasoning:
      "I have managed both sides of this. Internal moves are the cleanest path when they work, and they fail quietly about half the time — your current manager has a delivery number to hit and you are on it.\n\nA data analyst role at a company with a real data function gets you the title, the tooling and colleagues who do this full time. From there the modelling work is a promotion rather than a career change. It is a smaller step that actually completes.",
    nextSteps: [
      "Apply to analyst roles at companies with a named data team, not a data person",
      "Ask in interviews who owns the models and who owns the dashboards — the answer tells you the ceiling",
    ],
    createdAt: "2026-07-31T16:45:00.000Z",
    updatedAt: "2026-07-31T16:45:00.000Z",
    likes: 23,
    dislikes: 18,
  },
  {
    id: "a-iq-branch-p-ishita",
    questionId: "iq-branch-vs-college",
    professionalUserId: "p-ishita",
    verdicts: [4, 2],
    pick: 0,
    summary: "Branch. I run the placement cell and I watch this play out every December.",
    reasoning:
      "I sit in the room when companies decide which branches to open a drive to. Almost every recruiter that arrives on any NIT campus opens to CSE. Mechanical drives at an older institute are fewer, smaller, and increasingly for roles that are software anyway.\n\nThe older-institute name is real, but it is worth a great deal less than it was fifteen years ago and it is worth almost nothing against a branch filter that happens before a human reads anything.",
    nextSteps: [
      "Ask both institutes for branch-wise placement data, not overall figures",
      "Ask specifically how many mechanical students were placed in core mechanical roles",
    ],
    createdAt: "2026-08-01T05:20:00.000Z",
    updatedAt: "2026-08-01T05:20:00.000Z",
    likes: 34,
    dislikes: 8,
  },
  {
    id: "a-iq-branch-p-arjun",
    questionId: "iq-branch-vs-college",
    professionalUserId: "p-arjun",
    verdicts: [3, 3],
    pick: -1,
    summary: "Neither, on the information you have given. This turns on something you have not said.",
    reasoning:
      "You have described the two options entirely in terms of what other people think of them, and not once in terms of what you want to do. That is the missing variable, and it decides this cleanly in either direction.\n\nIf you want to write software, take CSE and the debate is over. If you actually want to build physical things, an older institute with real labs and a functioning workshop culture is not a sentimental choice, it is the correct one — and the placement gap is survivable via GATE, which the mechanical route makes easier rather than harder.",
    nextSteps: [
      "Answer honestly whether you have ever enjoyed writing code, not whether you can",
      "Look at what each institute's mechanical department actually publishes and builds",
      "Come back and re-ask this with that answer in it",
    ],
    createdAt: "2026-08-01T13:30:00.000Z",
    updatedAt: "2026-08-01T13:30:00.000Z",
    likes: 29,
    dislikes: 14,
  },
];

/* ------------------------------------------------ comments on public answers

   Third parties, not the asker. These are what publishing a question buys: the
   next person in the same situation adding the thing the professional could not
   know.

   THREADED, so the fixtures have to exercise threading rather than describe it.
   The chains below are the three cases the tree has to survive: a disagreement
   two levels deep (`c-iq-ca-*`), the answer's own author replying to a comment
   directed at them (`c-iq-ca-3-r1`) — allowed precisely because it is a reply
   and not a comment of their own — and single replies that go nowhere, which
   is what most of them do.

   `likes` and `dislikes` are simulated like every other count in this build.
   They are small and uneven on purpose: round, flattering numbers are the tell
   of invented engagement, and this section's whole argument is that its numbers
   mean what they say. At least one answer is deliberately contentious — the
   Big Four case takes 27 likes and 31 dislikes — because two counts exist
   precisely so a divided response reads as divided rather than as nothing. */
export const SELF_COMMENTS: AnswerComment[] = [
  {
    id: "c-iq-ca-1",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-shreya",
    authorUserId: "u-mohit",
    authorName: "Mohit Ramachandran",
    authorInitials: "MR",
    body: "Did mid-size and can confirm the range point. What nobody mentions is that you also get to know the partners, which matters enormously when you are looking for your first job after.",
    createdAt: "2026-07-28T15:40:00.000Z",
    likes: 14,
    dislikes: 2,
    simulated: true,
  },
  {
    id: "c-iq-ca-2",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-shreya",
    parentId: "c-iq-ca-1",
    authorUserId: "u-aisha",
    authorName: "Aisha Bhat",
    authorInitials: "AB",
    body: "Counter-point from the other side: I did mid-size, loved it, and then spent eight months getting past CV screens for industry roles. The range was real and so was the filter.",
    createdAt: "2026-07-29T08:15:00.000Z",
    likes: 9,
    dislikes: 5,
    simulated: true,
  },
  {
    id: "c-iq-ca-2-r1",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-shreya",
    parentId: "c-iq-ca-2",
    authorUserId: "u-mohit",
    authorName: "Mohit Ramachandran",
    authorInitials: "MR",
    body: "Fair. Were you applying to industry directly, or through a recruiter? Every person I know who got filtered was going direct.",
    createdAt: "2026-07-29T11:02:00.000Z",
    likes: 3,
    dislikes: 1,
    simulated: true,
  },
  {
    id: "c-iq-ca-2-r2",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-shreya",
    parentId: "c-iq-ca-2-r1",
    authorUserId: "u-aisha",
    authorName: "Aisha Bhat",
    authorInitials: "AB",
    body: "Direct, mostly. The two that came through a recruiter did not ask where I articled at all, which rather makes your point.",
    createdAt: "2026-07-29T13:47:00.000Z",
    likes: 6,
    dislikes: 0,
    simulated: true,
  },
  {
    id: "c-iq-ca-3",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-farhan",
    authorUserId: "u-vinod",
    authorName: "Vinod Rajan",
    authorInitials: "VR",
    body: "The rotation question is the right one to ask. Two of the four offices I know of will not rotate an article at all, and they do not volunteer that at the offer stage.",
    createdAt: "2026-07-30T06:50:00.000Z",
    likes: 11,
    dislikes: 3,
    simulated: true,
  },
  {
    // The author of the answer, replying to a comment addressed to them. This
    // is the one thing they may post under their own answer — see `canComment`.
    id: "c-iq-ca-3-r1",
    questionId: "iq-ca-articleship",
    professionalUserId: "p-farhan",
    parentId: "c-iq-ca-3",
    authorUserId: "p-farhan",
    authorName: "Farhan Qureshi",
    authorInitials: "FQ",
    body: "Agreed, and ask for it in writing. A verbal rotation promise at the offer stage is worth about as much as the partner who made it remembering it two years later.",
    createdAt: "2026-07-30T09:15:00.000Z",
    likes: 21,
    dislikes: 2,
    simulated: true,
  },
  {
    id: "c-iq-gate-1",
    questionId: "iq-gate-vs-job",
    professionalUserId: "p-devansh",
    authorUserId: "u-swati",
    authorName: "Swati Menon",
    authorInitials: "SM",
    body: "Dropped a year in 2023 and it worked, but only because I treated it like a job with fixed hours. The month I let it become flexible I lost about six weeks.",
    createdAt: "2026-07-31T04:25:00.000Z",
    likes: 17,
    dislikes: 4,
    simulated: true,
  },
  {
    id: "c-iq-gate-1-r1",
    questionId: "iq-gate-vs-job",
    professionalUserId: "p-devansh",
    parentId: "c-iq-gate-1",
    authorUserId: "u-pranit",
    authorName: "Pranit Deshmukh",
    authorInitials: "PD",
    body: "This is the part people underestimate. Nobody fails the drop year on aptitude, they fail it in the third month when there is no structure left.",
    createdAt: "2026-07-31T09:40:00.000Z",
    likes: 8,
    dislikes: 1,
    simulated: true,
  },
  {
    id: "c-iq-gate-2",
    questionId: "iq-gate-vs-job",
    professionalUserId: "p-tanvi",
    authorUserId: "u-arnav",
    authorName: "Arnav Kulkarni",
    authorInitials: "AK",
    body: "Worth adding: some service companies will hold a joining date by three to six months if you ask before signing. Nobody tells you this and it changes the arithmetic completely.",
    createdAt: "2026-08-01T07:35:00.000Z",
    likes: 24,
    dislikes: 3,
    simulated: true,
  },
  {
    id: "c-iq-data-1",
    questionId: "iq-data-switch",
    professionalUserId: "p-ananya",
    authorUserId: "u-rhea",
    authorName: "Rhea Sequeira",
    authorInitials: "RS",
    body: "Made this exact switch at 31 with no masters. The unprompted-analysis approach is precisely what worked — it took two attempts before one landed with the right person.",
    createdAt: "2026-07-31T12:20:00.000Z",
    likes: 19,
    dislikes: 2,
    simulated: true,
  },
  {
    id: "c-iq-data-1-r1",
    questionId: "iq-data-switch",
    professionalUserId: "p-ananya",
    parentId: "c-iq-data-1",
    authorUserId: "u-tejas",
    authorName: "Tejas Prabhu",
    authorInitials: "TP",
    body: "Which two? I have sent three and heard nothing, and I suspect I am picking questions nobody in the room actually cares about.",
    createdAt: "2026-08-01T06:12:00.000Z",
    likes: 4,
    dislikes: 0,
    simulated: true,
  },
  {
    id: "c-iq-data-1-r2",
    questionId: "iq-data-switch",
    professionalUserId: "p-ananya",
    parentId: "c-iq-data-1-r1",
    authorUserId: "u-rhea",
    authorName: "Rhea Sequeira",
    authorInitials: "RS",
    body: "Churn in the first ninety days, and a refund-rate breakdown by channel. Both were things somebody had asked about in a meeting and nobody had time to look at.",
    createdAt: "2026-08-01T08:30:00.000Z",
    likes: 13,
    dislikes: 1,
    simulated: true,
  },
  {
    id: "c-iq-data-2",
    questionId: "iq-data-switch",
    professionalUserId: "p-divya",
    authorUserId: "u-tejas",
    authorName: "Tejas Prabhu",
    authorInitials: "TP",
    body: "The stalled-internal-move point is underrated. Mine was agreed verbally twice and never happened, and I lost a year and a half finding that out.",
    createdAt: "2026-08-01T09:05:00.000Z",
    likes: 15,
    dislikes: 6,
    simulated: true,
  },
  {
    id: "c-iq-branch-1",
    questionId: "iq-branch-vs-college",
    professionalUserId: "p-ishita",
    authorUserId: "u-gaurav",
    authorName: "Gaurav Sinha",
    authorInitials: "GS",
    body: "Ask for the branch-wise data in writing. Two institutes I asked quoted an overall figure and went quiet when I asked them to break it down.",
    createdAt: "2026-08-01T10:15:00.000Z",
    likes: 22,
    dislikes: 1,
    simulated: true,
  },
  {
    id: "c-iq-branch-1-r1",
    questionId: "iq-branch-vs-college",
    professionalUserId: "p-ishita",
    parentId: "c-iq-branch-1",
    authorUserId: "u-nisha",
    authorName: "Nisha Varma",
    authorInitials: "NV",
    body: "Going quiet is the answer. If the split were good it would be on the front of the brochure.",
    createdAt: "2026-08-01T12:05:00.000Z",
    likes: 18,
    dislikes: 9,
    simulated: true,
  },
  {
    id: "c-iq-branch-2",
    questionId: "iq-branch-vs-college",
    professionalUserId: "p-arjun",
    authorUserId: "u-nisha",
    authorName: "Nisha Varma",
    authorInitials: "NV",
    body: "This is the only answer here that asked what he wants rather than what the market wants. Mechanical at a place with a real workshop is a completely different life from mechanical on paper.",
    createdAt: "2026-08-01T14:40:00.000Z",
    likes: 7,
    dislikes: 4,
    simulated: true,
  },
];
