/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Written reasons attached to poll votes. Names are not real people and the
 * helpful counts are invented. Polls have no threads by design — a reason
 * stands on its own next to the vote it explains.
 */

import type { PollOptionId, PollReason } from "@/lib/types";

interface Raw {
  side: PollOptionId;
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
    // Deliberately deeper than the other polls: twelve a side, so the report's
    // ten-per-option cap is exercised by real fixture data rather than only by
    // a test, and the losing column is substantial enough to be worth reading.
    { side: "a", name: "Tanvi Malhotra", initials: "TM", text: "Ninety minutes each way is three unpaid hours. Nobody issuing a mandate has ever put that number in the business case.", time: "50 minutes ago", helpful: 3480 },
    { side: "a", name: "Bhaskar Rao", initials: "BR", text: "Output has been measured at our firm for four years. It did not fall. The mandate arrived anyway, which tells you it was never about output.", time: "3 hours ago", helpful: 2740 },
    { side: "a", name: "Lakshmi Venkatesh", initials: "LV", text: "I moved my parents in with us because I am home to help. A mandate does not just move my desk, it dismantles that arrangement.", time: "4 hours ago", helpful: 2590 },
    { side: "a", name: "Imtiaz Qureshi", initials: "IQ", text: "The office is open-plan. I put on headphones to block out the room, then take calls with people on other floors. Explain the point of the journey.", time: "6 hours ago", helpful: 2410 },
    { side: "a", name: "Ritu Chandran", initials: "RC", text: "Every senior person I know negotiated an exception quietly. The policy applies to whoever lacks the leverage to argue with it.", time: "8 hours ago", helpful: 2260 },
    { side: "a", name: "Devansh Kapoor", initials: "DK", text: "We gave up the second floor and the lease savings went into the results. Now the same company wants the room back at a higher rate.", time: "9 hours ago", helpful: 1980 },
    { side: "a", name: "Shalini Prabhakar", initials: "SP", text: "I have a chronic condition that is manageable at home and exhausting on a train. Remote was not a perk, it was the accommodation.", time: "11 hours ago", helpful: 1840 },
    { side: "a", name: "Manoj Deshmukh", initials: "MD", text: "Hiring got better the moment we stopped filtering for one city. The mandate has quietly reversed that and nobody has said so out loud.", time: "13 hours ago", helpful: 1670 },
    { side: "a", name: "Ayesha Siddiqui", initials: "AS", text: "Attendance is being measured because it is easy to measure. Output is hard to measure, so it lost.", time: "16 hours ago", helpful: 1520 },
    { side: "a", name: "Prakash Menon", initials: "PM", text: "Four hours of my day belonged to me and now they do not. That is a pay cut described as a culture initiative.", time: "18 hours ago", helpful: 1390 },
    { side: "a", name: "Neelam Joshi", initials: "NJ", text: "The childcare maths simply does not work. I am not choosing the sofa over the office, I am choosing to keep the job at all.", time: "21 hours ago", helpful: 1240 },
    { side: "a", name: "Sudhir Bhattacharya", initials: "SB", text: "Two years of being told the distributed model was the future, then a lease renewal changed everyone's mind about human connection.", time: "1 day ago", helpful: 1080 },
    { side: "b", name: "Aniket Ranade", initials: "AR", text: "I learned more in six months sitting next to a senior engineer than in two years of calls. For anyone early, the room is the training.", time: "2 hours ago", helpful: 2180 },
    { side: "b", name: "Pooja Iyer", initials: "PI", text: "Remote works for people who already have a network. It quietly penalises everyone who is still building one.", time: "7 hours ago", helpful: 1920 },
    { side: "b", name: "Harsh Vardhan", initials: "HV", text: "Every hard problem I have solved this year happened at a whiteboard with two other people. I have never once replicated that on a call.", time: "5 hours ago", helpful: 1760 },
    { side: "b", name: "Kalpana Srinivasan", initials: "KS", text: "My flat has one room. Working from it meant never leaving it. The commute is the only thing that ends my day.", time: "10 hours ago", helpful: 1610 },
    { side: "b", name: "Rehan Mirza", initials: "RM", text: "Promotion decisions are made by people who remember you. Two years remote taught me that is not cynicism, it is just true.", time: "12 hours ago", helpful: 1470 },
    { side: "b", name: "Anjali Thakur", initials: "AT", text: "Onboarding remotely was six weeks of not knowing who to ask. I would not put a new joiner through it again.", time: "14 hours ago", helpful: 1350 },
    { side: "b", name: "Vikram Salunkhe", initials: "VS", text: "The team drifted into four separate teams that shared a repository. Being in the room is what stopped that.", time: "15 hours ago", helpful: 1220 },
    { side: "b", name: "Fatima Zaidi", initials: "FZ", text: "Half my job is catching a problem in a corridor before it becomes a meeting. That does not have a remote equivalent.", time: "17 hours ago", helpful: 1140 },
    { side: "b", name: "Girish Kamath", initials: "GK", text: "I was more productive at home and considerably worse at my actual job, which is helping other people do theirs.", time: "19 hours ago", helpful: 1020 },
    { side: "b", name: "Sneha Bhaskar", initials: "SB", text: "The people arguing loudest for remote are senior enough that nobody checks on them. Juniors are drowning quietly.", time: "22 hours ago", helpful: 940 },
    { side: "b", name: "Arvind Raghavan", initials: "AR", text: "Three days would be a compromise. The all-or-nothing framing on both sides is what has made this unresolvable.", time: "1 day ago", helpful: 820 },
    { side: "b", name: "Deepa Nagarajan", initials: "DN", text: "I miss the incidental part. Not the meetings — the lunch where somebody mentions the thing you needed to know.", time: "1 day ago", helpful: 710 },
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
  "first-language": [
    { side: "a", name: "Anaya Kulkarni", initials: "AK", text: "The students who quit in week three quit because nothing worked yet. Python gets something working on day one, and that is most of the battle.", time: "2 hours ago", helpful: 1620 },
    { side: "a", name: "Rohit Menon", initials: "RM", text: "You can teach memory later to somebody who already believes they can program. The reverse order loses half the room.", time: "5 hours ago", helpful: 1180 },
    { side: "b", name: "Priyanka Das", initials: "PD", text: "Every student I have taught who started with C debugged faster three years later. They knew what the machine was actually doing.", time: "1 hour ago", helpful: 1490 },
    { side: "b", name: "Sameer Qureshi", initials: "SQ", text: "Abstractions are much easier to appreciate once you have lived without them. Start where the abstractions are not.", time: "6 hours ago", helpful: 940 },
    { side: "c", name: "Diya Raghavan", initials: "DR", text: "Nothing else lets a beginner send their parents a link on day two. That first bit of pride keeps people in the subject.", time: "3 hours ago", helpful: 1310 },
    { side: "c", name: "Imran Bakshi", initials: "IB", text: "The browser is already installed on every machine in the lab. Zero setup is an underrated pedagogical property.", time: "8 hours ago", helpful: 760 },
  ],
  "work-setup": [
    { side: "a", name: "Nandita Sen", initials: "NS", text: "Three hours of commuting a day bought me nothing. I have never been more productive than I have been at my own desk.", time: "1 hour ago", helpful: 2040 },
    { side: "a", name: "Vivek Prabhu", initials: "VP", text: "The best team I have worked on was distributed across four cities and wrote everything down. That habit was the whole advantage.", time: "4 hours ago", helpful: 1370 },
    { side: "b", name: "Meghna Iyer", initials: "MI", text: "The flexibility is the point. Some weeks I need the room and some weeks I need the quiet, and only I know which.", time: "40 minutes ago", helpful: 2610 },
    { side: "b", name: "Aditya Raman", initials: "AR", text: "Fixed days are just a shorter commute schedule. If I am trusted to do the work, I am trusted to pick the days.", time: "3 hours ago", helpful: 1880 },
    { side: "c", name: "Kavya Hegde", initials: "KH", text: "Going in and finding nobody there is the worst of both. Fixed days at least mean the office is worth the trip.", time: "2 hours ago", helpful: 1450 },
    { side: "c", name: "Tarun Bhatia", initials: "TB", text: "New joiners learn by overhearing. You cannot overhear anything if the team is never in on the same day.", time: "7 hours ago", helpful: 1120 },
    { side: "d", name: "Farida Noorani", initials: "FN", text: "My flat is not an office and never will be. Leaving the building is what lets the day actually end.", time: "5 hours ago", helpful: 980 },
    { side: "d", name: "Gaurav Malhotra", initials: "GM", text: "Everything difficult I have solved happened at a whiteboard with two other people. I have never replicated that on a call.", time: "9 hours ago", helpful: 830 },
  ],
  /* ------------------------------------------------------ Approval ratings

     Opinions about a named person's *performance in office* — which is
     ordinary political speech and the whole point of an approval poll. What is
     deliberately absent: any factual claim about a real individual, any
     allegation, and anything a person could be defamed by. A reason here
     argues about policy and delivery, or it does not belong. */
  "approval-modi": [
    { side: "a", name: "Sanjay Deshpande", initials: "SD", text: "Whatever else you think, the infrastructure programme is visible in places that were ignored for forty years. I judge the job on what actually got built.", time: "2 hours ago", helpful: 4120 },
    { side: "a", name: "Latha Krishnan", initials: "LK", text: "Direct benefit transfer worked. My mother receives her pension without paying anybody to receive it, and that is not a small thing.", time: "5 hours ago", helpful: 3480 },
    { side: "b", name: "Imran Vohra", initials: "IV", text: "Growth figures are not the same as jobs. Ask anybody who finished a degree in the last three years how the market feels from where they are standing.", time: "3 hours ago", helpful: 3910 },
    { side: "b", name: "Nandini Rao", initials: "NR", text: "The centralisation is the problem for me. States are being handed responsibilities without the revenue to meet them, and that is a structural choice, not an accident.", time: "7 hours ago", helpful: 3240 },
  ],
  "approval-rahul-gandhi": [
    { side: "a", name: "Ashish Bhalla", initials: "AB", text: "He has been consistent on the questions he raises in the House even when it cost him politically. Scrutiny is the job description and he does turn up to it.", time: "4 hours ago", helpful: 2610 },
    { side: "a", name: "Priyanka Menon", initials: "PM", text: "The opposition finally has a coherent line on unemployment rather than a different grievance every week. That is an improvement worth acknowledging.", time: "9 hours ago", helpful: 2080 },
    { side: "b", name: "Vikrant Sharma", initials: "VS", text: "Holding a government to account requires an alternative programme, and I still could not tell you what it is on the economy.", time: "6 hours ago", helpful: 2940 },
    { side: "b", name: "Fatima Ansari", initials: "FA", text: "Too much of the messaging is reactive. Opposition should be setting some of the agenda, not responding to all of it.", time: "1 day ago", helpful: 2270 },
  ],
  "approval-yogi-adityanath": [
    { side: "a", name: "Ramesh Tiwari", initials: "RT", text: "Law and order in the district I live in is measurably different from ten years ago. That is the thing most people here actually vote on.", time: "3 hours ago", helpful: 2840 },
    { side: "a", name: "Sunita Yadav", initials: "SY", text: "Expressway connectivity has changed what is possible for a small business outside the big cities. Ours is one of them.", time: "8 hours ago", helpful: 2190 },
    { side: "b", name: "Arif Khan", initials: "AK", text: "Administration measured only by enforcement is half a job. Health and school outcomes in the state are still near the bottom of the table.", time: "5 hours ago", helpful: 2530 },
    { side: "b", name: "Deepika Saxena", initials: "DS", text: "Exam conduct has been a recurring failure and it affects hundreds of thousands of families every single year.", time: "11 hours ago", helpful: 2060 },
  ],
  "approval-mamata-banerjee": [
    { side: "a", name: "Subhadeep Ghosh", initials: "SG", text: "The welfare schemes reach women directly in a state where that was not previously true. I weigh that heavily.", time: "4 hours ago", helpful: 1960 },
    { side: "a", name: "Anjali Dutta", initials: "AD", text: "She has held the state against enormous central pressure for three terms. Whatever your politics, that is a political achievement.", time: "10 hours ago", helpful: 1620 },
    { side: "b", name: "Rituparno Bose", initials: "RB", text: "Industrial investment has gone elsewhere for a decade and a half. Young people leave the state to work, and that is the whole argument.", time: "6 hours ago", helpful: 2140 },
    { side: "b", name: "Kaushik Mitra", initials: "KM", text: "Local administration quality varies enormously by district, which suggests the delivery mechanism is not actually under control.", time: "1 day ago", helpful: 1780 },
  ],
  "approval-stalin": [
    { side: "a", name: "Meena Sundaram", initials: "MS", text: "The state runs. Schools, transport, power, the things that are boring when they work — they work, and I do not take that for granted.", time: "2 hours ago", helpful: 2380 },
    { side: "a", name: "Karthik Raman", initials: "KR", text: "Industrial policy has actually pulled investment in rather than announcing it. The difference shows up in the employment numbers.", time: "7 hours ago", helpful: 1940 },
    { side: "b", name: "Bhavani Selvam", initials: "BS", text: "The freebie-versus-welfare argument is real and the fiscal position is worse than the state admits. That bill arrives later.", time: "9 hours ago", helpful: 1710 },
    { side: "b", name: "Joseph Xavier", initials: "JX", text: "Urban governance in Chennai has not kept pace with the state's rhetoric. One monsoon a year still exposes that.", time: "1 day ago", helpful: 1450 },
  ],
  "approval-kejriwal": [
    { side: "a", name: "Neeraj Chopra", initials: "NC", text: "The schools model was genuinely tried and genuinely measured. Very few people in Indian politics have attempted anything that specific.", time: "5 hours ago", helpful: 1880 },
    { side: "a", name: "Shweta Bindra", initials: "SB", text: "Clinics within walking distance changed how ordinary illness gets treated in my neighbourhood. That is a real policy outcome.", time: "12 hours ago", helpful: 1520 },
    { side: "b", name: "Harpreet Sethi", initials: "HS", text: "An anti-establishment platform that has now been the establishment for a decade needs a different account of itself than it gives.", time: "8 hours ago", helpful: 2010 },
    { side: "b", name: "Malini Iyer", initials: "MI", text: "The governance record and the national ambition point in different directions, and the second keeps interrupting the first.", time: "1 day ago", helpful: 1660 },
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
