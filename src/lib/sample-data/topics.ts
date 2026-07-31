/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Every participant count, percentage and change figure below is invented for
 * the clickable prototype so flows and layouts can be reviewed before the
 * database exists. Subjects are drawn from real, publicly discussed topics so
 * the copy reads realistically; the numbers attached to them are not real
 * measurements of anything.
 *
 * Topics in the Politicians category are framed by office rather than by
 * personal name on purpose: publishing invented approval figures against a
 * named real individual would read as real polling. Replace with named
 * topics only once the numbers are genuine.
 *
 * Nothing in this directory may be shipped to a real deployment.
 */

import { ASPECTS } from "@/lib/sample-data/aspects";
import type { Topic } from "@/lib/types";

const RAW: Topic[] = [
  /* ------------------------------------------------------ Entertainment */
  {
    id: "kalki2",
    name: "Kalki 2898 AD Part 2",
    cat: "entertainment",
    facetSet: "film",
    status: "Live",
    summary:
      "The year's biggest domestic release. Audiences agree on the spectacle and split hard on the second half.",
    about:
      "The sequel to the 2024 science-fiction epic, released across IMAX and 4DX on 23 July 2026. Discussion centres on whether the world-building justifies the runtime, and on a second half that several reviewers describe as over-explained.",
    tags: ["film", "telugu cinema", "box office", "sci-fi", "imax"],
    pos: 68,
    neu: 19,
    neg: 13,
    participants: 24118,
    trend: 96,
    recency: 1,
    updated: "40m ago",
    change: { metric: "participation", value: 22.6, direction: "up" },
  },
  {
    id: "panchayat5",
    name: "Panchayat Season 5",
    cat: "entertainment",
    facetSet: "series",
    status: "Live",
    summary:
      "The final season landed without a misstep for most viewers, though two mid-season episodes divide opinion.",
    about:
      "All eight episodes of the concluding season released simultaneously on 18 July 2026. The debate is mostly about pacing: whether the election subplot needed the space it took, and whether the finale earned five seasons of build-up.",
    tags: ["web series", "streaming", "comedy", "finale"],
    pos: 74,
    neu: 18,
    neg: 8,
    participants: 18442,
    trend: 93,
    recency: 2,
    updated: "3h ago",
    change: { metric: "positive-sentiment", value: 6.4, direction: "up" },
  },
  {
    id: "mirzapur4",
    name: "Mirzapur Season 4",
    cat: "entertainment",
    facetSet: "series",
    status: "Live",
    summary:
      "The franchise's fourth season. The body count is up; whether the writing kept pace is the argument.",
    about:
      "Released in July 2026 after a two-year gap. Longtime viewers are split on whether the show still has somewhere to go, or is repeating its own beats with a larger budget.",
    tags: ["web series", "streaming", "crime drama", "sequel"],
    pos: 41,
    neu: 23,
    neg: 36,
    participants: 21340,
    trend: 89,
    recency: 2,
    updated: "5h ago",
    change: { metric: "discussion", value: 17.2, direction: "up" },
  },
  {
    id: "arijittour",
    name: "Arijit Singh Stadium Tour 2026",
    cat: "entertainment",
    facetSet: "brand",
    status: "Ongoing",
    summary:
      "Six cities, sold out in minutes. The performances are beyond dispute; the ticketing and the sound are not.",
    about:
      "The nationwide stadium tour opened in July 2026. Resale prices reached several times face value within an hour of the first sale, and audio quality in the upper tiers has become its own thread.",
    tags: ["live music", "concert", "ticketing", "tour"],
    pos: 52,
    neu: 19,
    neg: 29,
    participants: 19870,
    trend: 90,
    recency: 2,
    updated: "4h ago",
    change: { metric: "participation", value: 28.4, direction: "up" },
  },

  /* -------------------------------------------------------------- Brands */
  {
    id: "netflixin",
    name: "Netflix India Price Revision",
    cat: "brands",
    facetSet: "platform",
    status: "Announced",
    summary:
      "A revised tier structure for Indian subscribers, announced mid-billing-cycle. The mobile plan took the sharpest rise.",
    about:
      "New pricing across all four subscription tiers was published on 24 July 2026, effective immediately for new accounts. Existing subscribers keep current rates for one further billing quarter. Most of the anger is about how the change was communicated rather than the amount.",
    tags: ["streaming", "pricing", "subscription", "ott"],
    pos: 12,
    neu: 23,
    neg: 65,
    participants: 14870,
    trend: 91,
    recency: 2,
    updated: "5h ago",
    change: { metric: "negative-sentiment", value: 19.3, direction: "up" },
  },
  {
    id: "zeptoten",
    name: "10-Minute Delivery Expansion",
    cat: "brands",
    facetSet: "brand",
    status: "Ongoing",
    summary:
      "Quick-commerce apps pushed into medicines and electronics. Convenience is loved; rider conditions are not.",
    about:
      "Through 2026 the major quick-commerce platforms extended ten-minute delivery beyond groceries into pharmacy and small electronics. Opinion splits between customers who find it genuinely useful and participants raising rider safety and dark-store labour conditions.",
    tags: ["quick commerce", "delivery", "gig work", "retail"],
    pos: 38,
    neu: 24,
    neg: 38,
    participants: 16205,
    trend: 87,
    recency: 3,
    updated: "9h ago",
    change: { metric: "discussion", value: 12.8, direction: "up" },
  },
  {
    id: "airindia",
    name: "Air India Cabin Refit Programme",
    cat: "brands",
    facetSet: "brand",
    status: "Ongoing",
    summary:
      "The retrofitted aircraft are a genuine improvement. Whether you get one is still a coin toss.",
    about:
      "The widebody retrofit programme is part-complete, so the same route can be operated by a refitted or an unrefitted aircraft. Opinion tracks almost entirely with which one a passenger last flew.",
    tags: ["airline", "aviation", "retrofit", "service"],
    pos: 44,
    neu: 22,
    neg: 34,
    participants: 15680,
    trend: 76,
    recency: 5,
    updated: "1d ago",
    change: { metric: "positive-sentiment", value: 8.9, direction: "up" },
  },
  {
    id: "starbucksin",
    name: "Starbucks India Price Reset",
    cat: "brands",
    facetSet: "brand",
    status: "Announced",
    summary:
      "A cheaper entry range aimed at smaller cities, launched alongside a quieter rise at the top end.",
    about:
      "A restructured menu introduced lower-priced short-format drinks while premium items rose. The company describes it as accessibility; regulars describe it as shrinkflation with better publicity.",
    tags: ["coffee", "retail", "pricing", "cafe"],
    pos: 36,
    neu: 28,
    neg: 36,
    participants: 11240,
    trend: 68,
    recency: 6,
    updated: "2d ago",
    change: { metric: "discussion", value: 9.4, direction: "up" },
  },

  /* ------------------------------------------------------------ Sports */
  {
    id: "t20squad",
    name: "India T20 World Cup 2026 Squad",
    cat: "sports",
    status: "Announced",
    summary:
      "The 15-member squad landed with two omissions nobody expected and a spin combination everybody is arguing about.",
    about:
      "The selection committee announced the World Cup squad on 22 July 2026. Two established middle-order batters were left out in favour of finishers with better recent strike rates, and the side carries three specialist spinners.",
    tags: ["cricket", "t20 world cup", "selection", "team india"],
    pos: 34,
    neu: 22,
    neg: 44,
    participants: 41260,
    trend: 99,
    recency: 1,
    updated: "1h ago",
    change: { metric: "participation", value: 46.2, direction: "up" },
  },
  {
    id: "impactplayer",
    name: "IPL Impact Player Rule Review",
    cat: "sports",
    status: "Completed",
    summary:
      "Five seasons in, the league is reviewing the substitute rule that captains and all-rounders keep complaining about.",
    about:
      "The governing council opened a formal review of the Impact Player substitution rule after the 2026 season closed. Several captains have argued publicly that it has devalued the genuine all-rounder; broadcasters point to higher scoring and better ratings.",
    tags: ["cricket", "ipl", "rules", "all-rounders"],
    pos: 29,
    neu: 26,
    neg: 45,
    participants: 22940,
    trend: 84,
    recency: 4,
    updated: "1d ago",
    change: { metric: "negative-sentiment", value: 8.7, direction: "up" },
  },
  {
    id: "isleague",
    name: "ISL Promotion & Relegation Plan",
    cat: "sports",
    status: "Proposed",
    summary:
      "A proposal to open the top flight to promotion from 2028. Fans of legacy clubs are unusually united in favour.",
    about:
      "A draft roadmap circulated in July 2026 proposes introducing promotion and relegation between the Indian Super League and the I-League from the 2028-29 season, ending the franchise-only model. Investor franchises have raised objections about valuation risk.",
    tags: ["football", "isl", "i-league", "promotion"],
    pos: 71,
    neu: 15,
    neg: 14,
    participants: 9840,
    trend: 76,
    recency: 5,
    updated: "1d ago",
    change: { metric: "positive-sentiment", value: 11.5, direction: "up" },
  },
  {
    id: "olympicbid",
    name: "India's 2036 Olympics Bid",
    cat: "sports",
    status: "Ongoing",
    summary:
      "Ahmedabad's bid is progressing. Support is broad, but the cost question keeps resurfacing.",
    about:
      "The formal bid for the 2036 Summer Olympics has entered the continuous dialogue stage with the IOC. Public opinion is strongly in favour of hosting; the argument is about capital expenditure and whether legacy venues get used afterwards.",
    tags: ["olympics", "2036", "ahmedabad", "infrastructure"],
    pos: 62,
    neu: 21,
    neg: 17,
    participants: 13470,
    trend: 79,
    recency: 6,
    updated: "2d ago",
    change: { metric: "trending", value: 9.3, direction: "up" },
  },

  /* -------------------------------------------------------- Technology */
  {
    id: "iphone18",
    name: "iPhone 18 Pro India Pricing",
    cat: "technology",
    facetSet: "gadget",
    status: "Announced",
    summary:
      "Locally assembled, and still the most expensive launch price yet. The camera is not the thing people are posting about.",
    about:
      "Announced on 21 July 2026 with India-assembled Pro models for the first time at launch. Despite local assembly the launch price rose again, which has become the dominant thread in the discussion.",
    tags: ["smartphone", "apple", "pricing", "make in india"],
    pos: 31,
    neu: 22,
    neg: 47,
    participants: 28650,
    trend: 94,
    recency: 2,
    updated: "4h ago",
    change: { metric: "negative-sentiment", value: 16.9, direction: "up" },
  },
  {
    id: "jioai",
    name: "Jio AI Assistant Rollout",
    cat: "technology",
    facetSet: "platform",
    status: "Ongoing",
    summary:
      "Bundled free with every plan and switched on by default. The default is the problem.",
    about:
      "A generative assistant was enabled across the operator's consumer apps in July 2026 at no extra cost. It is opt-out rather than opt-in, and the data-use terms have drawn the bulk of the criticism.",
    tags: ["ai", "telecom", "privacy", "assistant"],
    pos: 26,
    neu: 25,
    neg: 49,
    participants: 19380,
    trend: 88,
    recency: 3,
    updated: "7h ago",
    change: { metric: "negative-sentiment", value: 21.4, direction: "up" },
  },
  {
    id: "iplstream",
    name: "IPL 2026 Streaming Quality",
    cat: "technology",
    facetSet: "platform",
    status: "Resolved",
    summary:
      "The picture held for 38 overs and collapsed in the last five. The operator has now acknowledged it.",
    about:
      "Viewers reported sharp bitrate drops during peak concurrency across several match nights in the 2026 season. The platform confirmed reduced bitrates at peak and added edge capacity for the closing fixtures. No service credit was offered.",
    tags: ["streaming", "cricket", "cdn", "concurrency"],
    pos: 21,
    neu: 27,
    neg: 52,
    participants: 31205,
    trend: 82,
    recency: 4,
    updated: "1d ago",
    change: { metric: "negative-sentiment", value: 9.1, direction: "down" },
  },
  {
    id: "evprice",
    name: "Electric Car Price War 2026",
    cat: "technology",
    facetSet: "gadget",
    status: "Ongoing",
    summary:
      "Three rounds of cuts in five months. Great for new buyers, brutal for anyone who bought in January.",
    about:
      "Successive price reductions across the mass-market electric car segment through 2026, driven by cheaper cells and new entrants. Existing owners have organised over residual values; new buyers are overwhelmingly positive.",
    tags: ["electric vehicles", "pricing", "automotive", "batteries"],
    pos: 57,
    neu: 20,
    neg: 23,
    participants: 12640,
    trend: 78,
    recency: 5,
    updated: "1d ago",
    change: { metric: "participation", value: 14.7, direction: "up" },
  },

  /* --------------------------------- National & International Events */
  {
    id: "wc2026",
    name: "FIFA World Cup 2026 Build-Up",
    cat: "events",
    status: "Upcoming",
    summary:
      "Three host nations, 48 teams, and a ticketing system that has already annoyed everyone who tried it.",
    about:
      "The expanded tournament opens across the United States, Canada and Mexico. Indian discussion centres on broadcast timings, dynamic ticket pricing and the viability of a 48-team group format.",
    tags: ["football", "world cup", "ticketing", "broadcast"],
    pos: 55,
    neu: 24,
    neg: 21,
    participants: 26890,
    trend: 92,
    recency: 2,
    updated: "6h ago",
    change: { metric: "participation", value: 33.5, direction: "up" },
  },
  {
    id: "chandrayaan4",
    name: "Chandrayaan-4 Sample Return",
    cat: "events",
    status: "Upcoming",
    summary:
      "The first Indian attempt to bring lunar material home. Near-total agreement, which is rare here.",
    about:
      "The sample-return mission is in final integration ahead of a launch window later this year. It would make India the fourth country to return lunar material. Discussion is about mission risk and budget allocation, not about whether it should happen.",
    tags: ["isro", "space", "moon", "sample return"],
    pos: 86,
    neu: 10,
    neg: 4,
    participants: 21540,
    trend: 89,
    recency: 3,
    updated: "11h ago",
    change: { metric: "positive-sentiment", value: 7.8, direction: "up" },
  },
  {
    id: "mumbaiflood",
    name: "Mumbai Monsoon Flooding Response",
    cat: "events",
    status: "Ongoing",
    summary:
      "The third serious waterlogging event this season. The drainage upgrade was supposed to have fixed this.",
    about:
      "Heavy rainfall in late July 2026 caused suburban rail suspensions and waterlogging across low-lying wards. Attention has shifted from the weather to the status of the storm-water drainage programme funded in previous budgets.",
    tags: ["mumbai", "monsoon", "civic", "infrastructure"],
    pos: 6,
    neu: 13,
    neg: 81,
    participants: 34720,
    trend: 97,
    recency: 1,
    updated: "35m ago",
    change: { metric: "negative-sentiment", value: 41.6, direction: "up" },
  },
  {
    id: "cop31",
    name: "COP31 Climate Finance Deal",
    cat: "events",
    status: "Completed",
    summary:
      "A headline number was agreed. Whether any of it is new money is the entire argument.",
    about:
      "The summit closed with a climate finance package for developing economies. Negotiators from the global south have questioned how much is genuinely additional versus rebadged existing commitments.",
    tags: ["climate", "cop31", "finance", "diplomacy"],
    pos: 24,
    neu: 33,
    neg: 43,
    participants: 11380,
    trend: 68,
    recency: 8,
    updated: "4d ago",
    change: { metric: "discussion", value: 5.2, direction: "down" },
  },

  /* -------------------------------------------------- National Politics */
  {
    id: "bihar26",
    name: "Bihar Assembly Election 2026",
    cat: "national-politics",
    status: "Upcoming",
    summary:
      "Seat-sharing is unresolved on both sides with weeks to go. Voters are being asked to wait again.",
    about:
      "Polling is expected in phases later this year. Both major alliances have unfinished seat-sharing negotiations, and the campaign so far has been dominated by migration and employment rather than the usual themes.",
    tags: ["bihar", "election", "alliance", "assembly"],
    pos: 22,
    neu: 34,
    neg: 44,
    participants: 29470,
    trend: 95,
    recency: 1,
    updated: "2h ago",
    change: { metric: "participation", value: 28.9, direction: "up" },
  },
  {
    id: "oneelection",
    name: "One Nation One Election Bill",
    cat: "national-politics",
    status: "Proposed",
    summary:
      "Simultaneous polls for the Lok Sabha and state assemblies. The cost case is strong; the federalism case is contested.",
    about:
      "The bill proposes synchronising national and state elections from a future cycle, requiring constitutional amendments and, in the transition, curtailing some assembly terms. That transition is where most of the objection sits.",
    tags: ["elections", "constitution", "federalism", "reform"],
    pos: 38,
    neu: 17,
    neg: 45,
    participants: 26140,
    trend: 90,
    recency: 2,
    updated: "5h ago",
    change: { metric: "discussion", value: 18.3, direction: "up" },
  },
  {
    id: "delimitation",
    name: "Lok Sabha Delimitation Debate",
    cat: "national-politics",
    status: "Disputed",
    summary:
      "Redrawing seats on 2026 population figures would shift power between north and south. Nobody is neutral.",
    about:
      "The freeze on parliamentary seat allocation is due to lapse, raising the question of whether representation should follow current population. Southern states argue they would be penalised for having achieved population stabilisation.",
    tags: ["delimitation", "parliament", "federalism", "representation"],
    pos: 19,
    neu: 24,
    neg: 57,
    participants: 18960,
    trend: 86,
    recency: 3,
    updated: "10h ago",
    change: { metric: "negative-sentiment", value: 12.4, direction: "up" },
  },
  {
    id: "oppalliance",
    name: "Opposition Alliance Seat Talks",
    cat: "national-politics",
    status: "Ongoing",
    summary:
      "Another round of talks, another postponed announcement. Even sympathetic participants are losing patience.",
    about:
      "Coordination talks between opposition parties on seat sharing have run past three self-imposed deadlines. Discussion is less about policy than about whether the arrangement is credible enough to be worth voting for.",
    tags: ["opposition", "coalition", "seat sharing", "politics"],
    pos: 17,
    neu: 29,
    neg: 54,
    participants: 15230,
    trend: 74,
    recency: 6,
    updated: "2d ago",
    change: { metric: "negative-sentiment", value: 6.1, direction: "up" },
  },

  /* ------------------------------------------------ Government Policies */
  {
    id: "upicharge",
    name: "UPI Transaction Charges Proposal",
    cat: "policies",
    status: "Proposed",
    summary:
      "A consultation paper floats merchant-side charges on high-value payments. Small traders read it as the thin end of a wedge.",
    about:
      "A regulator discussion paper proposes merchant-side charges above a defined transaction value, with person-to-person transfers explicitly out of scope. The paper does not define the small-value threshold clearly, which is the source of most of the alarm.",
    tags: ["upi", "payments", "merchants", "fintech"],
    pos: 7,
    neu: 15,
    neg: 78,
    participants: 33180,
    trend: 98,
    recency: 1,
    updated: "25m ago",
    change: { metric: "negative-sentiment", value: 38.2, direction: "up" },
  },
  {
    id: "fourday",
    name: "Four-Day Work Week Pilot",
    cat: "policies",
    status: "Proposed",
    summary:
      "A voluntary compressed-hours pilot for private employers. The enthusiasm is real; so is the pay-protection question.",
    about:
      "A draft framework defines maximum daily hours and pay-protection conditions for employers who join a voluntary pilot. Applications opened on 23 July 2026. Shift-based and manufacturing sectors are largely excluded in practice.",
    tags: ["labour", "work week", "pilot", "employment"],
    pos: 66,
    neu: 21,
    neg: 13,
    participants: 27410,
    trend: 93,
    recency: 3,
    updated: "8h ago",
    change: { metric: "participation", value: 24.5, direction: "up" },
  },
  {
    id: "gigrules",
    name: "Gig Worker Social Security Rules",
    cat: "policies",
    status: "Announced",
    summary:
      "Aggregators must now contribute to a welfare fund. Riders welcome it and doubt it will reach them.",
    about:
      "Notified rules require platform aggregators to contribute a percentage of turnover to a social security fund covering delivery and ride-hailing workers. The disbursement mechanism has not been published.",
    tags: ["gig economy", "social security", "labour", "platforms"],
    pos: 54,
    neu: 26,
    neg: 20,
    participants: 17820,
    trend: 81,
    recency: 4,
    updated: "1d ago",
    change: { metric: "positive-sentiment", value: 9.6, direction: "up" },
  },
  {
    id: "nep",
    name: "New Education Policy Implementation",
    cat: "policies",
    status: "Ongoing",
    summary:
      "Six years in, adoption still varies by state, and a student who moves can lose a year.",
    about:
      "Rollout of the national framework continues unevenly across states, schools and universities. A credit transfer framework was notified in July 2026 to address the mobility problem, which had been flagged at drafting stage.",
    tags: ["education", "nep", "credit transfer", "states"],
    pos: 45,
    neu: 27,
    neg: 28,
    participants: 15320,
    trend: 70,
    recency: 7,
    updated: "3d ago",
    change: { metric: "discussion", value: 4.1, direction: "down" },
  },

  /* ------------------------------------------------------- Politicians */
  {
    id: "office-finance",
    name: "Union Finance Ministry: Budget 2026 Record",
    cat: "politicians",
    status: "Ongoing",
    summary:
      "Capex delivery is ahead of target; the personal income tax relief that was promised has not appeared.",
    about:
      "An assessment of the finance portfolio's performance against its own Budget 2026 commitments. Rated by office rather than by individual so the aggregate reads as a policy verdict, not a personality poll.",
    tags: ["budget", "fiscal policy", "taxation", "capex"],
    pos: 33,
    neu: 26,
    neg: 41,
    participants: 20140,
    trend: 83,
    recency: 4,
    updated: "14h ago",
    change: { metric: "negative-sentiment", value: 7.3, direction: "up" },
  },
  {
    id: "office-railways",
    name: "Railways Ministry: Safety & Punctuality",
    cat: "politicians",
    status: "Ongoing",
    summary:
      "New trains keep launching. Punctuality on the older network keeps slipping.",
    about:
      "An assessment of the railways portfolio on the two things passengers actually measure: safety incidents and on-time performance. Premium service expansion and legacy network performance are pulling the score in opposite directions.",
    tags: ["railways", "safety", "punctuality", "infrastructure"],
    pos: 41,
    neu: 23,
    neg: 36,
    participants: 24380,
    trend: 80,
    recency: 5,
    updated: "1d ago",
    change: { metric: "participation", value: 11.2, direction: "up" },
  },
  {
    id: "office-cm-karnataka",
    name: "Karnataka CM's Office: Bengaluru Delivery",
    cat: "politicians",
    status: "Ongoing",
    summary:
      "Judged almost entirely on one city's roads, water and metro timelines — and it is not going well.",
    about:
      "An assessment of the state executive's performance on Bengaluru's civic delivery: road quality, water supply, and the repeatedly deferred metro corridors. Rural outcomes score noticeably better than urban ones.",
    tags: ["karnataka", "bengaluru", "civic", "state government"],
    pos: 15,
    neu: 22,
    neg: 63,
    participants: 22610,
    trend: 85,
    recency: 3,
    updated: "9h ago",
    change: { metric: "negative-sentiment", value: 15.8, direction: "up" },
  },
  {
    id: "office-opposition",
    name: "Leader of the Opposition: Parliament Record",
    cat: "politicians",
    status: "Ongoing",
    summary:
      "Attendance and interventions are up. Whether the disruptions help the argument is the open question.",
    about:
      "An assessment of the opposition leadership on parliamentary performance: attendance, quality of interventions, private member business, and use of disruption as a tactic.",
    tags: ["parliament", "opposition", "accountability", "debate"],
    pos: 28,
    neu: 31,
    neg: 41,
    participants: 16940,
    trend: 72,
    recency: 6,
    updated: "2d ago",
    change: { metric: "discussion", value: 8.4, direction: "up" },
  },

  /* ---------------------------------------------------------- Colleges */
  {
    id: "iitb",
    name: "IIT Bombay Placement Season 2025-26",
    cat: "colleges",
    status: "Ongoing",
    summary:
      "Day one moved fast. The gap between departments after day six is what people are actually talking about.",
    about:
      "Phase one aggregate offer counts have been published; department-level figures have not. Median packages are steady while the top decile pulls away, which the headline number hides.",
    tags: ["iit bombay", "placements", "engineering", "recruitment"],
    pos: 62,
    neu: 24,
    neg: 14,
    participants: 14203,
    trend: 77,
    recency: 4,
    updated: "1d ago",
    change: { metric: "participation", value: 5.6, direction: "up" },
  },
  {
    id: "iima",
    name: "IIM Ahmedabad Fee Hike",
    cat: "colleges",
    status: "Announced",
    summary:
      "An 11% rise for the incoming batch, announced alongside a larger waiver pool that reaches far fewer people.",
    about:
      "A revised two-year programme fee was published in the admissions handbook on 14 July 2026, with an expanded needs-based waiver corpus announced three days later. The waiver covers a few dozen students; the fee applies to everyone.",
    tags: ["iim", "mba", "fees", "financial aid"],
    pos: 15,
    neu: 22,
    neg: 63,
    participants: 13867,
    trend: 75,
    recency: 5,
    updated: "2d ago",
    change: { metric: "negative-sentiment", value: 11.3, direction: "up" },
  },
  {
    id: "du-fyup",
    name: "Delhi University Four-Year Rollout",
    cat: "colleges",
    status: "Ongoing",
    summary:
      "The first four-year cohort graduates this year. Postgraduate departments are still catching up on eligibility.",
    about:
      "The extended undergraduate structure has reached its first graduating cohort. A regulator circular in July 2026 directed universities to treat the four-year degree as eligible for one-year masters admission, after months of ambiguity.",
    tags: ["delhi university", "fyup", "undergraduate", "eligibility"],
    pos: 38,
    neu: 25,
    neg: 37,
    participants: 16730,
    trend: 71,
    recency: 6,
    updated: "2d ago",
    change: { metric: "discussion", value: 6.9, direction: "up" },
  },
  {
    id: "nitt",
    name: "NIT Trichy Campus Infrastructure",
    cat: "colleges",
    status: "Completed",
    summary:
      "The new lab block is genuinely good. First-year hostels are still three to a two-person room.",
    about:
      "A laboratory block was commissioned in July 2026 ahead of the incoming session. Teaching infrastructure scores well; residential capacity remains the standing complaint and has had no announcement attached to it.",
    tags: ["nit trichy", "campus", "hostels", "laboratories"],
    pos: 71,
    neu: 20,
    neg: 9,
    participants: 8145,
    trend: 58,
    recency: 8,
    updated: "5d ago",
    change: { metric: "positive-sentiment", value: 3.4, direction: "up" },
  },

  /* ------------------------------------------------------------- Exams */
  {
    id: "neet",
    name: "NEET UG 2026 Paper Leak Allegations",
    cat: "exams",
    status: "Under Investigation",
    summary:
      "Claims that question papers circulated before the national medical entrance exam. A four-member panel is examining documented complaints.",
    about:
      "Unverified reports of a paper circulating before the examination began spreading on 4 May 2026. The testing agency acknowledged written complaints on 6 May, a panel was constituted on 11 May, and two arrests followed on 19 May. No finding has been published.",
    tags: ["neet", "medical entrance", "paper leak", "nta"],
    pos: 8,
    neu: 14,
    neg: 78,
    participants: 42847,
    trend: 96,
    recency: 2,
    updated: "2h ago",
    change: { metric: "negative-sentiment", value: 14.2, direction: "up" },
  },
  {
    id: "upsc-key",
    name: "UPSC Prelims 2026 Answer Key Disputes",
    cat: "exams",
    status: "Disputed",
    summary:
      "Objections filed against nine questions across two papers. Aspirants want the reasoning published, not just the correction.",
    about:
      "The provisional key drew formal objections on nine questions, several with defensible alternative answers. The commission does not publish its rationale for accepting or rejecting objections, which is the substance of the complaint.",
    tags: ["upsc", "civil services", "answer key", "objections"],
    pos: 12,
    neu: 25,
    neg: 63,
    participants: 25490,
    trend: 89,
    recency: 3,
    updated: "8h ago",
    change: { metric: "participation", value: 19.7, direction: "up" },
  },
  {
    id: "cuet",
    name: "CUET UG 2026 Result Delay",
    cat: "exams",
    status: "Resolved",
    summary:
      "Results arrived nineteen days late, after two universities had already closed their first admission list.",
    about:
      "Scorecards were released on 14 July 2026 following a nineteen-day delay. Universities were advised to extend first-list deadlines, but not all did. The admission calendar for the next cycle has not been revised.",
    tags: ["cuet", "admissions", "results", "delay"],
    pos: 9,
    neu: 16,
    neg: 75,
    participants: 20412,
    trend: 66,
    recency: 9,
    updated: "6d ago",
    change: { metric: "negative-sentiment", value: 6.5, direction: "down" },
  },
  {
    id: "gate",
    name: "GATE 2026 CS Paper Difficulty",
    cat: "exams",
    status: "Completed",
    summary:
      "Lighter aptitude, heavier core, and four algorithms questions with no clean answer at the given precision.",
    about:
      "The objection window closed on 22 July 2026 with challenges recorded against four questions. Whether the paper was harder depends largely on which half a candidate prepared for; the numerical precision issue is a separate, narrower complaint.",
    tags: ["gate", "computer science", "difficulty", "answer key"],
    pos: 34,
    neu: 40,
    neg: 26,
    participants: 18190,
    trend: 64,
    recency: 7,
    updated: "3d ago",
    change: { metric: "discussion", value: 3.8, direction: "down" },
  },

  /* ---------------------------------------------------- Career Streams */
  {
    id: "ms-abroad",
    name: "Master's Abroad in 2026",
    cat: "careers",
    status: "Ongoing",
    summary:
      "Visa rules tightened in three major destinations while fees rose. The arithmetic no longer works for everyone.",
    about:
      "Post-study work rights and dependant visa rules changed in several popular destinations through 2025-26. Participants who went before the changes report very different outcomes from those applying now, which makes the aggregate worth reading by cohort.",
    tags: ["masters", "study abroad", "visa", "roi"],
    pos: 29,
    neu: 27,
    neg: 44,
    participants: 31760,
    trend: 91,
    recency: 2,
    updated: "4h ago",
    change: { metric: "negative-sentiment", value: 17.5, direction: "up" },
  },
  {
    id: "mba-roi",
    name: "Is an MBA Still Worth It?",
    cat: "careers",
    status: "Ongoing",
    summary:
      "Fees up, median packages flat, and consulting hiring down two years running. Tier-one still clears; the rest is arguable.",
    about:
      "A running assessment of MBA return on investment after the hiring slowdown. The split is sharp by institution tier, so the headline number is less useful here than the facet breakdown.",
    tags: ["mba", "roi", "placements", "business school"],
    pos: 31,
    neu: 24,
    neg: 45,
    participants: 28930,
    trend: 88,
    recency: 3,
    updated: "7h ago",
    change: { metric: "participation", value: 21.3, direction: "up" },
  },
  {
    id: "cse-glut",
    name: "B.Tech CSE Seat Glut",
    cat: "careers",
    status: "Ongoing",
    summary:
      "Seats expanded faster than entry-level hiring. First-year students are asking whether they picked the wrong year.",
    about:
      "Computer science intake across private engineering colleges has grown steeply while entry-level software hiring has flattened. The debate is whether this is a cyclical correction or a structural oversupply.",
    tags: ["btech", "computer science", "hiring", "engineering"],
    pos: 21,
    neu: 26,
    neg: 53,
    participants: 35410,
    trend: 94,
    recency: 2,
    updated: "3h ago",
    change: { metric: "negative-sentiment", value: 26.8, direction: "up" },
  },
  {
    id: "govt-vs-private",
    name: "Government Job vs Private Sector",
    cat: "careers",
    status: "Ongoing",
    summary:
      "Security against ceiling. The people who chose each path disagree with each other more than you would expect.",
    about:
      "A standing comparison of the two dominant career paths on pay trajectory, stability, work-life balance and preparation cost. Participants who spent years preparing without clearing report the sharpest views.",
    tags: ["government jobs", "private sector", "stability", "salary"],
    pos: 42,
    neu: 29,
    neg: 29,
    participants: 24180,
    trend: 79,
    recency: 5,
    updated: "1d ago",
    change: { metric: "discussion", value: 10.4, direction: "up" },
  },

  /* ---------------------------------------------------- Food & Dining */
  {
    id: "delivery-fees",
    name: "Food Delivery Platform Fees",
    cat: "food",
    facetSet: "platform",
    status: "Ongoing",
    summary:
      "Platform fee, handling fee, small-order fee, surge. The advertised price and the paid price have quietly diverged.",
    about:
      "Line-item charges on the two major delivery apps rose again through 2026. The dish price on the menu is now routinely 30-40% below what appears at checkout once fees and packaging are added, which is where most of the anger sits.",
    tags: ["food delivery", "fees", "pricing", "apps"],
    pos: 9,
    neu: 18,
    neg: 73,
    participants: 38410,
    trend: 95,
    recency: 1,
    updated: "50m ago",
    change: { metric: "negative-sentiment", value: 24.7, direction: "up" },
  },
  {
    id: "cloud-kitchens",
    name: "Cloud Kitchen Hygiene Ratings",
    cat: "food",
    status: "Under Investigation",
    summary:
      "Four brands, one kitchen, no shopfront to inspect. Inspectors have started turning up unannounced.",
    about:
      "Delivery-only kitchens often run several listed brands from a single unlicensed unit. A food-safety drive across three cities in July 2026 found repeated licensing and storage violations, and a proposal would require the operating kitchen's rating to appear on every listing.",
    tags: ["cloud kitchen", "food safety", "hygiene", "licensing"],
    pos: 11,
    neu: 21,
    neg: 68,
    participants: 21470,
    trend: 87,
    recency: 2,
    updated: "5h ago",
    change: { metric: "participation", value: 29.3, direction: "up" },
  },
  {
    id: "street-food-licensing",
    name: "Street Food Vendor Licensing Drive",
    cat: "food",
    status: "Ongoing",
    summary:
      "A push to bring carts into the licensing net. Everyone agrees on hygiene and disagrees on whether this achieves it.",
    about:
      "A municipal drive requires registration, a hygiene certificate and fixed vending zones for street food carts. Supporters point to genuine food-safety gains; vendors' associations argue the fee and zoning rules price out the smallest operators.",
    tags: ["street food", "licensing", "vendors", "municipal"],
    pos: 34,
    neu: 26,
    neg: 40,
    participants: 17250,
    trend: 78,
    recency: 4,
    updated: "1d ago",
    change: { metric: "discussion", value: 13.6, direction: "up" },
  },
  {
    id: "millet-menus",
    name: "Millet Menus in Restaurants",
    cat: "food",
    status: "Ongoing",
    summary:
      "On menus everywhere, ordered by almost nobody, and priced like a wellness product.",
    about:
      "Restaurant chains added millet-based dishes through 2025-26 following a sustained policy push. Nutritionists are broadly supportive; diners report that the dishes are frequently priced above their wheat and rice equivalents for no obvious reason.",
    tags: ["millets", "restaurants", "nutrition", "menu"],
    pos: 46,
    neu: 31,
    neg: 23,
    participants: 9840,
    trend: 62,
    recency: 6,
    updated: "3d ago",
    change: { metric: "positive-sentiment", value: 5.2, direction: "up" },
  },

  /* --------------------------------------------------- Controversies */
  {
    id: "blrmetro",
    name: "Bengaluru Metro Yellow Line Delay",
    cat: "controversies",
    status: "Delayed",
    summary:
      "Trains are sitting in the depot. Three revised opening dates later, nobody will say plainly what the blocker is.",
    about:
      "Commercial service on the corridor has been deferred pending signalling certification, after end-to-end trial runs were completed in July 2026. No revised opening date has been notified. Rolling stock is no longer the constraint.",
    tags: ["bengaluru", "metro", "signalling", "delays"],
    pos: 9,
    neu: 17,
    neg: 74,
    participants: 31933,
    trend: 92,
    recency: 2,
    updated: "6h ago",
    change: { metric: "negative-sentiment", value: 13.9, direction: "up" },
  },
  {
    id: "deepfake-ads",
    name: "Deepfake Ads Using Public Figures",
    cat: "controversies",
    status: "Under Investigation",
    summary:
      "Synthetic endorsements for investment schemes are running at scale. Takedowns are slower than uploads.",
    about:
      "Investment and health-product advertisements using synthesised likenesses of well-known figures have proliferated across social platforms. An enforcement inquiry is open; the platforms' takedown response times are the central issue.",
    tags: ["deepfake", "fraud", "advertising", "platform liability"],
    pos: 4,
    neu: 12,
    neg: 84,
    participants: 29470,
    trend: 95,
    recency: 1,
    updated: "1h ago",
    change: { metric: "participation", value: 37.4, direction: "up" },
  },
  {
    id: "coaching-safety",
    name: "Coaching Centre Safety Violations",
    cat: "controversies",
    status: "Under Investigation",
    summary:
      "Basement classrooms, single exits, and enrolment far past sanctioned capacity. Inspections started after the fact.",
    about:
      "A drive across coaching hubs found repeated fire-safety and occupancy violations. Sealing notices have been issued in several cities. Parents' associations are asking why the sanctioning process allowed it in the first place.",
    tags: ["coaching", "safety", "regulation", "students"],
    pos: 5,
    neu: 14,
    neg: 81,
    participants: 23860,
    trend: 90,
    recency: 3,
    updated: "12h ago",
    change: { metric: "negative-sentiment", value: 22.1, direction: "up" },
  },
  {
    id: "ainews",
    name: "AI Bylines in Newsrooms",
    cat: "controversies",
    status: "Disputed",
    summary:
      "Machine-drafted copy is going out under human bylines. Draft guidance exists; nothing is binding yet.",
    about:
      "Two national publications have published internal policies on machine-assisted copy, and an editors' body has issued draft guidance recommending article-level disclosure. No regulator requires it. The argument is about accountability, not authorship.",
    tags: ["journalism", "ai", "disclosure", "bylines"],
    pos: 18,
    neu: 34,
    neg: 48,
    participants: 17660,
    trend: 73,
    recency: 5,
    updated: "1d ago",
    change: { metric: "discussion", value: 10.6, direction: "up" },
  },
];

/**
 * Topic-specific aspects are authored separately in `aspects.ts` and attached
 * here, so the topic records stay readable and a topic that has not been
 * given its own questions falls back to the category set.
 */
export const TOPICS: Topic[] = RAW.map((topic) => ({
  ...topic,
  aspects: ASPECTS[topic.id],
}));

export const TOPICS_BY_ID: ReadonlyMap<string, Topic> = new Map(
  TOPICS.map((e) => [e.id, e]),
);
