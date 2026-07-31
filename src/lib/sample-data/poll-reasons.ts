/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Written reasons attached to poll votes. Names are not real people and the
 * helpful counts are invented. Polls have no threads by design — a reason
 * stands on its own next to the vote it explains.
 */

import type { PollReason, PollSideId } from "@/lib/types";

interface Raw {
  side: PollSideId;
  name: string;
  initials: string;
  text: string;
  time: string;
  helpful: number;
}

const RAW: Record<string, Raw[]> = {
  "theatre-ott": [
    { side: "a", name: "Vikas Nambiar", initials: "VN", text: "The room is half the film. A gasp from four hundred people at the same second is not something a platform can ship to you.", time: "1 hour ago", helpful: 1840 },
    { side: "a", name: "Reshma Pillai", initials: "RP", text: "I have watched the same film both ways. On a laptop I checked my phone twice. In a theatre I did not move.", time: "3 hours ago", helpful: 1210 },
    { side: "b", name: "Ipshita Ghosh", initials: "IG", text: "Two tickets, parking and popcorn is nine hundred rupees before the film starts. My whole month of streaming costs less than one outing.", time: "2 hours ago", helpful: 2140 },
    { side: "b", name: "Farhan Sheikh", initials: "FS", text: "Subtitles, pause for the door, and nobody filming the screen. I stopped pretending the theatre experience is reliably good.", time: "5 hours ago", helpful: 1680 },
  ],
  "messi-ronaldo": [
    { side: "a", name: "Debjit Sarkar", initials: "DS", text: "One of them invented passes that did not exist before he made them. That is a different category of thing from scoring more.", time: "40 minutes ago", helpful: 3120 },
    { side: "a", name: "Nikita Verma", initials: "NV", text: "Watch either of them at 34 and ask which one still made the players around him better. That settles it for me.", time: "2 hours ago", helpful: 2480 },
    { side: "b", name: "Hemant Kulkarni", initials: "HK", text: "He rebuilt his game four times across four leagues and kept producing. Longevity at that level is not luck, it is the achievement.", time: "1 hour ago", helpful: 2960 },
    { side: "b", name: "Sarita Naidu", initials: "SN", text: "The talent argument always favours the one it came easier to. I will take the one who manufactured it.", time: "4 hours ago", helpful: 2210 },
  ],
  "iphone-pixel": [
    { side: "a", name: "Ravi Shanbhag", initials: "RS", text: "Kept the last one five years and sold it for 40% of what I paid. Amortise that and the price gap mostly disappears.", time: "2 hours ago", helpful: 1740 },
    { side: "a", name: "Meher Jain", initials: "MJ", text: "Six years of updates. I have watched three Android phones in my family stop getting security patches while still working fine.", time: "6 hours ago", helpful: 1320 },
    { side: "b", name: "Karan Bedi", initials: "KB", text: "38% more money for a marginally better screen and a worse camera in low light. The resale argument only works if you sell.", time: "1 hour ago", helpful: 2380 },
    { side: "b", name: "Tanya Kohli", initials: "TK", text: "I take photographs of a toddler indoors. Nothing else in this price range comes close, and that is the whole use case.", time: "4 hours ago", helpful: 1560 },
  ],
  "ev-hybrid": [
    { side: "a", name: "Simran Ahluwalia", initials: "SA", text: "Nine thousand kilometres this year, all city, charged at home overnight. My running cost is a fifth of what it was.", time: "3 hours ago", helpful: 1420 },
    { side: "a", name: "Girish Pattnaik", initials: "GP", text: "The network is genuinely fine on the corridors people actually drive. Everyone quoting range anxiety last drove an EV in 2021.", time: "8 hours ago", helpful: 980 },
    { side: "b", name: "Suresh Iyengar", initials: "SI", text: "I do Bengaluru to Coimbatore monthly. Two of the four fast chargers on that route were broken the last three times.", time: "5 hours ago", helpful: 1860 },
    { side: "b", name: "Anita Kurien", initials: "AK", text: "Hybrid asks nothing of you. No app, no queue, no planning where you stop. That convenience is worth the extra fuel.", time: "1 day ago", helpful: 1140 },
  ],
  "wfh-office": [
    { side: "a", name: "Tanvi Malhotra", initials: "TM", text: "Ninety minutes each way is three unpaid hours. Nobody issuing a mandate has ever put that number in the business case.", time: "50 minutes ago", helpful: 3480 },
    { side: "a", name: "Bhaskar Rao", initials: "BR", text: "Output has been measured at our firm for four years. It did not fall. The mandate arrived anyway, which tells you it was never about output.", time: "3 hours ago", helpful: 2740 },
    { side: "b", name: "Aniket Ranade", initials: "AR", text: "I learned more in six months sitting next to a senior engineer than in two years of calls. For anyone early, the room is the training.", time: "2 hours ago", helpful: 2180 },
    { side: "b", name: "Pooja Iyer", initials: "PI", text: "Remote works for people who already have a network. It quietly penalises everyone who is still building one.", time: "7 hours ago", helpful: 1920 },
  ],
  "mba-ms": [
    { side: "a", name: "Ira Bhandari", initials: "IB", text: "Switched function, doubled comp in eighteen months, no visa to worry about. The domestic network compounds for decades here.", time: "2 hours ago", helpful: 1680 },
    { side: "a", name: "Kunal Sabharwal", initials: "KS", text: "Watched three friends finish abroad into a one-year work window and come home anyway. The downside case is much worse than the brochures admit.", time: "5 hours ago", helpful: 1940 },
    { side: "b", name: "Shalini Prabhu", initials: "SP", text: "Went, stayed, permanent residence three years on. Harder than it was, not impossible, and the ceiling is genuinely different.", time: "4 hours ago", helpful: 1520 },
    { side: "b", name: "Rohan Kalra", initials: "RK", text: "If it is funded research, go. If it is a self-funded taught masters at 2026 fees, the maths only works for a few fields.", time: "9 hours ago", helpful: 1810 },
  ],
  "iit-ivy": [
    { side: "a", name: "Sathish Ramalingam", initials: "SR", text: "Twelve years out, and the tag still opens a first conversation anywhere in this country. That is worth more than people abroad assume.", time: "5 hours ago", helpful: 1640 },
    { side: "a", name: "Harini Balaji", initials: "HB", text: "Four years surrounded by people who cleared the same paper changes what you think is normal to attempt. That peer effect is the actual product.", time: "8 hours ago", helpful: 1280 },
    { side: "b", name: "Aditi Ramaswamy", initials: "AR", text: "Smaller classes, professors who knew my name, and the option to work in four countries. The mobility is the point.", time: "6 hours ago", helpful: 1740 },
    { side: "b", name: "Ishaan Gokhale", initials: "IG", text: "The IIT answer assumes you stay. If you do not, the network thins out fast past a certain longitude.", time: "1 day ago", helpful: 1120 },
  ],
  "neet-jee": [
    { side: "a", name: "Priya Nair", initials: "PN", text: "180 questions in 200 minutes with negative marking. It is not the depth, it is that one careless tick costs you four thousand ranks.", time: "1 hour ago", helpful: 2640 },
    { side: "a", name: "Rohit Menon", initials: "RM", text: "Biology alone is more retention than the whole of JEE. People who did not sit it underrate how much has to stay in your head.", time: "4 hours ago", helpful: 1980 },
    { side: "b", name: "Anushka Wagle", initials: "AW", text: "JEE Advanced questions are built specifically to defeat a memorised method. You cannot grind your way through them, and that is harder.", time: "2 hours ago", helpful: 2880 },
    { side: "b", name: "Praveen Kumar", initials: "PK", text: "Compare the top percentile cutoffs. NEET rewards accuracy at volume; Advanced rewards thinking nobody taught you. Different, and harder.", time: "6 hours ago", helpful: 2310 },
  ],
  "metro-roads": [
    { side: "a", name: "Deepa Srinivasan", initials: "DS", text: "Every widened road in this city refilled within three years. We have run that experiment repeatedly and keep pretending we have not.", time: "4 hours ago", helpful: 2140 },
    { side: "a", name: "Yusuf Merchant", initials: "YM", text: "One metro corridor at peak moves more people than six lanes of road. The rupee-per-passenger arithmetic is not close.", time: "9 hours ago", helpful: 1680 },
    { side: "b", name: "Basavaraj Hittalmani", initials: "BH", text: "Metro serves eleven wards. The road serves everyone, including the buses and the ambulances. Fix what most people use.", time: "7 hours ago", helpful: 1480 },
    { side: "b", name: "Anwar Shaikh", initials: "AS", text: "Six years for a corridor while my street floods every monsoon. I would take the unglamorous fix that arrives this year.", time: "1 day ago", helpful: 1240 },
  ],
  "tax-regime": [
    { side: "a", name: "Rohan Deshpande", initials: "RD", text: "Home loan interest, 80C, and health insurance for two parents. Ran both last year: the old regime saved me 71,000.", time: "6 hours ago", helpful: 1580 },
    { side: "a", name: "Swati Bhagat", initials: "SB", text: "The new regime is simpler and quietly more expensive for anyone who saves seriously. Simplicity is not the same as cheaper.", time: "11 hours ago", helpful: 1320 },
    { side: "b", name: "Zaid Farooqui", initials: "ZF", text: "I spent four Aprils hunting receipts to save less than the new regime gives me automatically. Never going back.", time: "8 hours ago", helpful: 1740 },
    { side: "b", name: "Pallavi Deshpande", initials: "PD", text: "If you rent and do not have a loan, the old regime is a trap you inherited from your parents' tax advisor.", time: "1 day ago", helpful: 1460 },
  ],
  "chai-coffee": [
    { side: "a", name: "Ranjeet Kumar", initials: "RK", text: "Chai is not a drink, it is a unit of time. You do not have a coffee break with someone for twenty years.", time: "2 hours ago", helpful: 2480 },
    { side: "a", name: "Sushmita Jha", initials: "SJ", text: "Four rupees at the stall outside the office, and the person making it knows how you take it. Beat that.", time: "5 hours ago", helpful: 1840 },
    { side: "b", name: "Ramya Subramaniam", initials: "RS", text: "Filter coffee in a steel tumbler, before anyone is allowed to speak to me. This is not a preference, it is a household constitution.", time: "3 hours ago", helpful: 2620 },
    { side: "b", name: "Peter Nongrum", initials: "PN", text: "Chai in most offices is a sugar delivery mechanism with tea leaves rumoured to be involved. Coffee at least tastes of something.", time: "10 hours ago", helpful: 1580 },
  ],
  "t20-test": [
    { side: "a", name: "Sandeep Rathore", initials: "SR", text: "T20 pays for the academies, the pensions and the women's game. Everyone romanticising Tests is spending T20's money.", time: "6 hours ago", helpful: 1620 },
    { side: "a", name: "Leena Fernandes", initials: "LF", text: "I can take my daughter to a full stadium on a Tuesday evening and she stays interested for three hours. That is how a sport survives.", time: "1 day ago", helpful: 1180 },
    { side: "b", name: "Rajat Sekhri", initials: "RS", text: "Five days is the only format that finds out whether someone can actually play. Everything else is a highlights reel with a result attached.", time: "7 hours ago", helpful: 2340 },
    { side: "b", name: "Manav Trivedi", initials: "MT", text: "Name a T20 innings you will remember in twenty years. Now name a Test session. That asymmetry is the whole argument.", time: "1 day ago", helpful: 1960 },
  ],
  "cook-order": [
    { side: "a", name: "Kritika Menon", initials: "KM", text: "Three hundred rupees of ingredients feeds us twice. The same meal delivered was 780 with fees. That gap is a week of groceries a month.", time: "1 hour ago", helpful: 2140 },
    { side: "a", name: "Suresh Iyengar", initials: "SI", text: "I know what oil went in, how much salt, and that it was cooked today. None of that is knowable from an app listing.", time: "4 hours ago", helpful: 1680 },
    { side: "b", name: "Tanvi Malhotra", initials: "TM", text: "After a ten-hour day the forty minutes is not free time, it is the only time. I will pay for it and not feel clever about cooking.", time: "2 hours ago", helpful: 1980 },
    { side: "b", name: "Farhan Sheikh", initials: "FS", text: "Cooking for one is where the maths breaks. Half the ingredients go off before I use them, so home cooking is not actually cheaper.", time: "6 hours ago", helpful: 1520 },
  ],
  "biryani-style": [
    { side: "a", name: "Basavaraj Hittalmani", initials: "BH", text: "Kacchi dum is a harder thing to get right and you can taste the risk. Raw meat and rice, one pot, no second chances.", time: "30 minutes ago", helpful: 2460 },
    { side: "a", name: "Sania Kapoor", initials: "SK", text: "Mirchi ka salan and dahi chutney are not side dishes, they are part of the design. Nothing on the Lucknowi side answers them.", time: "3 hours ago", helpful: 1840 },
    { side: "b", name: "Nusrat Ali", initials: "NA", text: "Restraint is harder than heat. Anyone can make you sweat; making you notice the kewra and the meat is the actual skill.", time: "2 hours ago", helpful: 2280 },
    { side: "b", name: "Zoya Hameed", initials: "ZH", text: "You can eat a full plate of Lucknowi and still want dinner tomorrow. Hyderabadi is magnificent and then you are done for the day.", time: "5 hours ago", helpful: 1720 },
  ],
};

export const POLL_REASONS: PollReason[] = Object.entries(RAW).flatMap(
  ([pollId, list]) =>
    list.map((reason, index) => ({
      ...reason,
      pollId,
      id: `${pollId}-r${index}`,
    })),
);

export function reasonsFor(pollId: string): PollReason[] {
  return POLL_REASONS.filter((r) => r.pollId === pollId);
}
