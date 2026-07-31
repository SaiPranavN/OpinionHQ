/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Editor-published developments and their source labels. In production these
 * come from the `TimelineEvent` + `SourceReference` tables and are written by
 * admins only (brief §11, §18). Here they are hand-authored so the Timeline
 * tab and the verified/unverified separation can be reviewed.
 */

import type { TopicContext, StatusId, TimelineEvent } from "@/lib/types";

interface RawEvent {
  date: string;
  title: string;
  desc: string;
  src: string;
  status: StatusId;
}

const RAW: Record<string, RawEvent[]> = {
  /* ------------------------------------------- Entertainment & Brands */
  kalki2: [
    { date: "July 24, 2026", title: "Opening weekend collections reported", desc: "Trade bodies reported the widest domestic release of the year for the title.", src: "Trade report", status: "Live" },
    { date: "July 23, 2026", title: "Theatrical release", desc: "The film released across formats including IMAX and 4DX.", src: "Distributor release note", status: "Live" },
  ],
  panchayat5: [
    { date: "July 22, 2026", title: "Follow-up project confirmed", desc: "The producers confirmed a spin-off is in writing.", src: "Producer statement", status: "Live" },
    { date: "July 18, 2026", title: "Season released in full", desc: "All eight episodes were released simultaneously on the platform.", src: "Platform release note", status: "Live" },
  ],
  netflixin: [
    { date: "July 25, 2026", title: "Existing plans grandfathered for 90 days", desc: "Current subscribers were told existing rates continue for one further billing quarter.", src: "Customer email", status: "Announced" },
    { date: "July 24, 2026", title: "Revised tiers published", desc: "New pricing for all four subscription tiers was published for Indian accounts.", src: "Company help centre", status: "Announced" },
  ],
  zeptoten: [
    { date: "July 22, 2026", title: "Pharmacy category expanded", desc: "Ten-minute delivery was extended to over-the-counter medicines in eight cities.", src: "Company announcement", status: "Ongoing" },
    { date: "July 9, 2026", title: "Rider safety guidelines issued", desc: "A state transport department issued advisory guidelines on delivery time targets.", src: "Transport department advisory", status: "Ongoing" },
  ],

  /* ------------------------------------------------------------ Sports */
  t20squad: [
    { date: "July 22, 2026", title: "Squad of 15 announced", desc: "The selection committee named the World Cup squad along with four reserves.", src: "Board press release", status: "Announced" },
    { date: "July 25, 2026", title: "Chief selector briefing", desc: "The selection rationale for the two omissions was set out at a press briefing.", src: "Press briefing", status: "Announced" },
  ],
  impactplayer: [
    { date: "July 20, 2026", title: "Formal rule review opened", desc: "The governing council opened a review of the substitution rule after the season closed.", src: "Council minutes", status: "Completed" },
    { date: "July 12, 2026", title: "Captains' feedback submitted", desc: "Written feedback from franchise captains was submitted to the technical committee.", src: "Committee note", status: "Completed" },
  ],
  isleague: [
    { date: "July 19, 2026", title: "Draft roadmap circulated", desc: "A draft proposing promotion and relegation from the 2028-29 season was circulated to clubs.", src: "Federation circular", status: "Proposed" },
    { date: "July 24, 2026", title: "Franchise objections filed", desc: "Several investor franchises submitted written objections on valuation risk.", src: "Club statements", status: "Proposed" },
  ],
  olympicbid: [
    { date: "July 15, 2026", title: "Continuous dialogue stage entered", desc: "The bid progressed to the continuous dialogue phase with the international committee.", src: "Committee communication", status: "Ongoing" },
    { date: "June 30, 2026", title: "Venue master plan submitted", desc: "A venue and legacy master plan was submitted as part of the bid dossier.", src: "Bid dossier", status: "Ongoing" },
  ],

  /* -------------------------------------------------------- Technology */
  iphone18: [
    { date: "July 21, 2026", title: "India pricing published", desc: "Launch pricing was published alongside confirmation of local Pro-model assembly.", src: "Company store listing", status: "Announced" },
    { date: "July 24, 2026", title: "Pre-order window opened", desc: "Pre-orders opened with exchange and financing offers from partner banks.", src: "Retail partner notice", status: "Announced" },
  ],
  jioai: [
    { date: "July 18, 2026", title: "Assistant enabled across consumer apps", desc: "The assistant was enabled by default for all subscribers at no additional cost.", src: "Operator announcement", status: "Ongoing" },
    { date: "July 23, 2026", title: "Data-use terms updated", desc: "Updated terms describing conversation retention were published in the app.", src: "Published terms of service", status: "Ongoing" },
  ],
  iplstream: [
    { date: "July 24, 2026", title: "Platform acknowledges degradation", desc: "The operator confirmed reduced bitrates during peak concurrency on two match nights.", src: "Platform status note", status: "Resolved" },
    { date: "July 22, 2026", title: "Record concurrency reported", desc: "A reported peak of 6.1 crore concurrent viewers was recorded during the final over.", src: "Operator statement", status: "Ongoing" },
    { date: "July 19, 2026", title: "Additional edge capacity announced", desc: "Extra edge capacity was announced for the remaining fixtures.", src: "Press release", status: "Ongoing" },
  ],
  evprice: [
    { date: "July 16, 2026", title: "Third price reduction of 2026", desc: "A further reduction was announced across mass-market variants.", src: "Manufacturer announcement", status: "Ongoing" },
    { date: "July 21, 2026", title: "Existing-owner goodwill scheme declined", desc: "The manufacturer confirmed no compensation scheme for recent buyers.", src: "Company statement", status: "Ongoing" },
  ],

  /* --------------------------------- National & International Events */
  wc2026: [
    { date: "July 20, 2026", title: "Second ticket ballot closed", desc: "The second sales phase closed with demand reported at several times available inventory.", src: "Organiser statement", status: "Upcoming" },
    { date: "July 8, 2026", title: "Match schedule confirmed", desc: "Kick-off times across all three host nations were confirmed.", src: "Official schedule", status: "Upcoming" },
  ],
  chandrayaan4: [
    { date: "July 23, 2026", title: "Final integration begun", desc: "The spacecraft entered final integration and testing ahead of the launch window.", src: "Agency update", status: "Upcoming" },
    { date: "July 2, 2026", title: "Sample container qualification completed", desc: "Qualification testing of the return container was reported complete.", src: "Agency technical note", status: "Upcoming" },
  ],
  mumbaiflood: [
    { date: "July 26, 2026", title: "Suburban services suspended", desc: "Services on two suburban corridors were suspended during morning peak.", src: "Railway advisory", status: "Ongoing" },
    { date: "July 25, 2026", title: "Red alert issued", desc: "A red alert was issued for the district for a 24-hour period.", src: "Meteorological department", status: "Ongoing" },
    { date: "July 14, 2026", title: "Drainage programme status tabled", desc: "A progress note on the storm-water drainage programme was tabled with the civic body.", src: "Civic body agenda", status: "Ongoing" },
  ],
  cop31: [
    { date: "July 12, 2026", title: "Finance package agreed", desc: "The summit closed with agreement on a headline climate finance figure.", src: "Summit communiqué", status: "Completed" },
    { date: "July 14, 2026", title: "Additionality questioned", desc: "Several delegations published notes questioning how much of the package is new money.", src: "Delegation statements", status: "Completed" },
  ],

  /* -------------------------------------------------- National Politics */
  bihar26: [
    { date: "July 24, 2026", title: "Poll schedule expected next month", desc: "The commission indicated the schedule would be announced in the coming weeks.", src: "Commission briefing", status: "Upcoming" },
    { date: "July 18, 2026", title: "Seat-sharing talks extended again", desc: "Both alliances extended internal seat-sharing deadlines for a third time.", src: "Party statements", status: "Upcoming" },
  ],
  oneelection: [
    { date: "July 22, 2026", title: "Committee report tabled", desc: "The examining committee tabled its report recommending a phased transition.", src: "Committee report", status: "Proposed" },
    { date: "July 25, 2026", title: "State governments seek time", desc: "Several state governments requested additional time to submit written views.", src: "Correspondence tabled in parliament", status: "Proposed" },
  ],
  delimitation: [
    { date: "July 21, 2026", title: "Inter-state consultation announced", desc: "A consultation with state governments on the seat allocation freeze was announced.", src: "Government notification", status: "Disputed" },
    { date: "July 10, 2026", title: "Southern states issue joint note", desc: "A joint note opposing population-only allocation was issued after a chief ministers' meeting.", src: "Joint statement", status: "Disputed" },
  ],
  oppalliance: [
    { date: "July 23, 2026", title: "Coordination meeting postponed", desc: "A scheduled coordination meeting was postponed for the second time this month.", src: "Party communication", status: "Ongoing" },
    { date: "July 6, 2026", title: "Common minimum programme drafted", desc: "A working group circulated a draft common minimum programme.", src: "Working group note", status: "Ongoing" },
  ],

  /* ------------------------------------------------ Government Policies */
  upicharge: [
    { date: "July 24, 2026", title: "Clarification issued on scope", desc: "Officials clarified that person-to-person transfers are outside the scope of the proposal.", src: "Press briefing", status: "Proposed" },
    { date: "July 23, 2026", title: "Industry bodies file objections", desc: "Two payment industry associations submitted written objections citing the effect on small merchants.", src: "Association statement", status: "Proposed" },
    { date: "July 21, 2026", title: "Consultation paper published", desc: "A discussion paper proposing merchant-side charges above a defined transaction value was released for public comment.", src: "Regulator consultation paper", status: "Proposed" },
  ],
  fourday: [
    { date: "July 23, 2026", title: "Pilot opened to private employers", desc: "Applications opened for employers wishing to join the compressed-hours pilot.", src: "Labour ministry notice", status: "Proposed" },
    { date: "July 16, 2026", title: "Draft framework released", desc: "A draft framework defined maximum daily hours and pay-protection conditions.", src: "Draft framework document", status: "Proposed" },
  ],
  gigrules: [
    { date: "July 20, 2026", title: "Rules notified", desc: "Rules requiring aggregator contributions to a welfare fund were notified.", src: "Government gazette", status: "Announced" },
    { date: "July 25, 2026", title: "Disbursement mechanism pending", desc: "Officials confirmed the disbursement mechanism has not yet been finalised.", src: "Press briefing", status: "Announced" },
  ],
  nep: [
    { date: "July 22, 2026", title: "Credit transfer framework notified", desc: "A framework for transferring credits between participating states was notified.", src: "Ministry notification", status: "Ongoing" },
    { date: "June 30, 2026", title: "Implementation review published", desc: "A status review reported uneven adoption across state boards.", src: "Implementation review report", status: "Ongoing" },
  ],

  /* ------------------------------------------------------- Politicians */
  "office-finance": [
    { date: "July 19, 2026", title: "Q1 capex utilisation published", desc: "First-quarter capital expenditure utilisation was reported ahead of the budgeted trajectory.", src: "Ministry data release", status: "Ongoing" },
    { date: "July 11, 2026", title: "Direct tax review deferred", desc: "The review of personal income tax slabs was deferred to the next budget cycle.", src: "Parliament reply", status: "Ongoing" },
  ],
  "office-railways": [
    { date: "July 24, 2026", title: "Punctuality report published", desc: "Zonal punctuality figures for the quarter were published, showing declines on three zones.", src: "Zonal performance review", status: "Ongoing" },
    { date: "July 5, 2026", title: "Two new premium routes launched", desc: "Two additional premium services were flagged off on eastern corridors.", src: "Railway press release", status: "Ongoing" },
  ],
  "office-cm-karnataka": [
    { date: "July 22, 2026", title: "Road restoration deadline revised", desc: "The deadline for the city road restoration programme was revised for the second time.", src: "Civic body order", status: "Ongoing" },
    { date: "July 9, 2026", title: "Rural water scheme milestone", desc: "The state reported completing household connections in four additional districts.", src: "State government release", status: "Ongoing" },
  ],
  "office-opposition": [
    { date: "July 23, 2026", title: "Session attendance published", desc: "Attendance and intervention counts for the monsoon session were published.", src: "Parliamentary records", status: "Ongoing" },
    { date: "July 17, 2026", title: "Adjournment motion moved", desc: "An adjournment motion was moved and subsequently disallowed.", src: "House proceedings", status: "Ongoing" },
  ],

  /* ---------------------------------------------------------- Colleges */
  iitb: [
    { date: "July 24, 2026", title: "Phase one offer counts published", desc: "The placement office published aggregate offer counts for the first phase of the cycle.", src: "Placement office report", status: "Ongoing" },
    { date: "July 5, 2026", title: "Placement season opened", desc: "The first phase of the current placement cycle opened across departments.", src: "Placement office notice", status: "Ongoing" },
  ],
  iima: [
    { date: "July 17, 2026", title: "Financial aid pool expanded", desc: "The institute announced an increase to the needs-based fee waiver corpus for the incoming batch.", src: "Institute announcement", status: "Announced" },
    { date: "July 14, 2026", title: "Revised programme fee published", desc: "A revised two-year programme fee was published in the admissions handbook.", src: "Admissions handbook", status: "Announced" },
  ],
  "du-fyup": [
    { date: "July 18, 2026", title: "Postgraduate eligibility clarified", desc: "Universities were directed to treat the four-year degree as eligible for one-year masters admission.", src: "Regulator circular", status: "Ongoing" },
    { date: "July 2, 2026", title: "First four-year cohort graduates", desc: "The first cohort under the extended structure completed its final year.", src: "University announcement", status: "Ongoing" },
  ],
  nitt: [
    { date: "July 16, 2026", title: "New laboratory block commissioned", desc: "A laboratory block was commissioned ahead of the incoming academic session.", src: "Institute announcement", status: "Completed" },
  ],

  /* ------------------------------------------------------------- Exams */
  neet: [
    { date: "June 2, 2026", title: "Supreme Court hearing scheduled", desc: "A petition seeking a re-examination was admitted and listed for hearing.", src: "Court listing", status: "Under Investigation" },
    { date: "May 19, 2026", title: "Two arrests made in Patna", desc: "Police confirmed the detention of two individuals in connection with the complaints.", src: "News report", status: "Under Investigation" },
    { date: "May 11, 2026", title: "Investigation committee formed", desc: "A four-member panel was constituted to examine the documented complaints.", src: "Ministry of Education", status: "Under Investigation" },
    { date: "May 6, 2026", title: "Testing agency acknowledges complaints", desc: "An official statement confirmed that written complaints had been received and were being reviewed.", src: "Agency press release", status: "Disputed" },
    { date: "May 4, 2026", title: "Allegations surface on social media", desc: "Unverified reports of a question paper circulating before the examination began spreading online.", src: "News report", status: "Disputed" },
  ],
  "upsc-key": [
    { date: "July 24, 2026", title: "Objection window closed", desc: "The window for challenging the provisional key closed with objections against nine questions.", src: "Commission notice", status: "Disputed" },
    { date: "July 15, 2026", title: "Provisional answer key released", desc: "Provisional keys for both papers were published along with response sheets.", src: "Commission portal", status: "Disputed" },
  ],
  cuet: [
    { date: "July 14, 2026", title: "Results published", desc: "Scorecards were released after a delay of nineteen days from the announced date.", src: "Examination portal", status: "Resolved" },
    { date: "July 9, 2026", title: "Universities asked to extend windows", desc: "Participating universities were advised to extend first-list deadlines.", src: "Regulator advisory", status: "Delayed" },
  ],
  gate: [
    { date: "July 22, 2026", title: "Objection window closed", desc: "The window for challenging provisional answer keys closed with objections recorded against four questions.", src: "Organising institute notice", status: "Completed" },
    { date: "July 15, 2026", title: "Provisional answer key released", desc: "Provisional answer keys and candidate response sheets were published.", src: "Examination portal", status: "Completed" },
  ],

  /* ---------------------------------------------------- Career Streams */
  "ms-abroad": [
    { date: "July 21, 2026", title: "Third destination tightens work rights", desc: "A major destination reduced post-study work duration for taught masters programmes.", src: "Immigration department notice", status: "Ongoing" },
    { date: "July 3, 2026", title: "Dependant visa rules narrowed", desc: "Dependant visa eligibility was narrowed for non-research programmes.", src: "Immigration department notice", status: "Ongoing" },
  ],
  "mba-roi": [
    { date: "July 20, 2026", title: "Consulting intake down for second year", desc: "Reported consulting intake across top programmes fell for a second consecutive year.", src: "Placement reports", status: "Ongoing" },
    { date: "July 8, 2026", title: "Audited placement reports published", desc: "Several institutes published audited placement reports with tier-wise breakdowns.", src: "Institute disclosures", status: "Ongoing" },
  ],
  "cse-glut": [
    { date: "July 23, 2026", title: "Intake approvals published", desc: "Approved computer science intake for the coming session was published, up again year on year.", src: "Regulator approval list", status: "Ongoing" },
    { date: "July 12, 2026", title: "Entry-level hiring survey released", desc: "An industry survey reported flat entry-level software hiring for the third year.", src: "Industry body survey", status: "Ongoing" },
  ],
  "govt-vs-private": [
    { date: "July 19, 2026", title: "Recruitment calendar published", desc: "A consolidated recruitment calendar for the coming year was published.", src: "Recruitment board notice", status: "Ongoing" },
  ],

  /* -------------------------------------------------------- Food & Dining */
  "delivery-fees": [
    { date: "July 24, 2026", title: "Platform fee raised again", desc: "Both major aggregators raised the flat platform fee on every order.", src: "In-app notice", status: "Ongoing" },
    { date: "July 12, 2026", title: "Restaurant body writes to regulator", desc: "An association of restaurants wrote to the competition regulator on commission structures.", src: "Association letter", status: "Ongoing" },
  ],
  "cloud-kitchens": [
    { date: "July 26, 2026", title: "Three-city inspection drive", desc: "A food-safety drive inspected delivery-only kitchens across three cities.", src: "Food safety authority release", status: "Under Investigation" },
    { date: "July 19, 2026", title: "Listing disclosure proposed", desc: "A proposal would require the operating kitchen's licence to appear on every brand listing.", src: "Draft advisory", status: "Under Investigation" },
  ],
  "street-food-licensing": [
    { date: "July 21, 2026", title: "Vending zones notified", desc: "Designated street vending zones were notified across the municipal area.", src: "Municipal order", status: "Ongoing" },
    { date: "July 6, 2026", title: "Registration window opened", desc: "Registration and hygiene certification opened for existing vendors.", src: "Municipal notice", status: "Ongoing" },
  ],
  "millet-menus": [
    { date: "July 15, 2026", title: "Chain menus expanded", desc: "Several national restaurant chains added further millet-based items.", src: "Company announcements", status: "Ongoing" },
  ],

  /* --------------------------------------------------- Controversies */
  blrmetro: [
    { date: "July 20, 2026", title: "Opening deferred to Q4", desc: "The operator deferred commercial service pending signalling certification.", src: "Operator board note", status: "Delayed" },
    { date: "July 11, 2026", title: "Trial runs completed on full corridor", desc: "End-to-end trial runs were completed across all stations on the line.", src: "News report", status: "Delayed" },
    { date: "June 28, 2026", title: "Safety inspection scheduled", desc: "The statutory safety inspection was scheduled with the rail regulator.", src: "Regulator listing", status: "Delayed" },
  ],
  "deepfake-ads": [
    { date: "July 26, 2026", title: "Enforcement inquiry opened", desc: "An enforcement inquiry into synthetic-likeness investment advertisements was opened.", src: "Enforcement agency statement", status: "Under Investigation" },
    { date: "July 22, 2026", title: "Platforms summoned", desc: "Two platforms were asked to explain advertiser verification procedures.", src: "Ministry summons", status: "Under Investigation" },
    { date: "July 15, 2026", title: "Advisory issued to intermediaries", desc: "An advisory required labelling of synthetically generated advertising content.", src: "Government advisory", status: "Disputed" },
  ],
  "coaching-safety": [
    { date: "July 25, 2026", title: "Sealing notices issued", desc: "Sealing notices were issued to centres found operating beyond sanctioned capacity.", src: "Municipal order", status: "Under Investigation" },
    { date: "July 18, 2026", title: "City-wide inspection drive begun", desc: "A fire-safety and occupancy inspection drive began across coaching hubs.", src: "Fire department release", status: "Under Investigation" },
  ],
  ainews: [
    { date: "July 23, 2026", title: "Editors' body issues draft guidance", desc: "Draft guidance recommended disclosure of machine assistance at article level.", src: "Editors' guild circular", status: "Disputed" },
    { date: "July 12, 2026", title: "Two newsrooms publish disclosure policies", desc: "Two national publications published their internal policies on machine-assisted copy.", src: "Published editorial policies", status: "Disputed" },
  ],
};

export const TIMELINE: TimelineEvent[] = Object.entries(RAW).flatMap(
  ([topicId, list]) =>
    list.map((event, index) => ({
      ...event,
      topicId,
      id: `${topicId}-tl-${index}`,
    })),
);

export function timelineFor(topicId: string): TimelineEvent[] {
  return TIMELINE.filter((t) => t.topicId === topicId);
}

/**
 * Editor-written status context and the verified developments plotted onto the
 * sentiment trend chart. Marker `left` is a position along the 30-day axis.
 */
export const TOPIC_CONTEXT: Record<string, TopicContext> = {
  kalki2: { updated: "Updated 40 minutes ago", explain: "The film is in wide theatrical release. Collection figures are trade estimates, not audited numbers.", markers: [{ left: "62%", label: "23 Jul · Released" }, { left: "84%", label: "24 Jul · Weekend numbers" }] },
  panchayat5: { updated: "Updated 3 hours ago", explain: "All episodes are available. A spin-off has been confirmed as in writing.", markers: [{ left: "54%", label: "18 Jul · Season released" }, { left: "80%", label: "22 Jul · Spin-off confirmed" }] },
  netflixin: { updated: "Updated 5 hours ago", explain: "Revised tiers are published and take effect for new accounts immediately; existing plans continue for 90 days.", markers: [{ left: "58%", label: "24 Jul · Tiers published" }, { left: "82%", label: "25 Jul · 90-day grace" }] },
  zeptoten: { updated: "Updated 9 hours ago", explain: "The pharmacy expansion is live in eight cities. A state advisory on delivery time targets has been issued but is not binding.", markers: [{ left: "38%", label: "9 Jul · Safety advisory" }, { left: "72%", label: "22 Jul · Pharmacy live" }] },

  t20squad: { updated: "Updated 1 hour ago", explain: "The squad is final. Reserve players may be called up until the tournament deadline.", markers: [{ left: "56%", label: "22 Jul · Squad named" }, { left: "84%", label: "25 Jul · Selector briefing" }] },
  impactplayer: { updated: "Updated 1 day ago", explain: "A formal review is open. The rule remains in force for the next season unless changed.", markers: [{ left: "44%", label: "12 Jul · Captains' feedback" }, { left: "74%", label: "20 Jul · Review opened" }] },
  isleague: { updated: "Updated 1 day ago", explain: "A draft roadmap is circulating. No governing-body vote has been scheduled.", markers: [{ left: "52%", label: "19 Jul · Roadmap circulated" }, { left: "80%", label: "24 Jul · Objections filed" }] },
  olympicbid: { updated: "Updated 2 days ago", explain: "The bid is in continuous dialogue. No host decision is due before 2027.", markers: [{ left: "34%", label: "30 Jun · Master plan filed" }, { left: "68%", label: "15 Jul · Dialogue stage" }] },

  iphone18: { updated: "Updated 4 hours ago", explain: "Pricing is published and pre-orders are open. Local assembly covers final assembly only.", markers: [{ left: "50%", label: "21 Jul · Pricing published" }, { left: "80%", label: "24 Jul · Pre-orders open" }] },
  jioai: { updated: "Updated 7 hours ago", explain: "The assistant is enabled by default. An opt-out exists in app settings.", markers: [{ left: "48%", label: "18 Jul · Assistant enabled" }, { left: "78%", label: "23 Jul · Terms updated" }] },
  iplstream: { updated: "Updated 1 day ago", explain: "The operator has acknowledged reduced bitrates at peak concurrency. No service credit has been announced.", markers: [{ left: "44%", label: "19 Jul · Capacity added" }, { left: "76%", label: "24 Jul · Issue acknowledged" }] },
  evprice: { updated: "Updated 1 day ago", explain: "Prices have been cut three times in 2026. No compensation scheme exists for earlier buyers.", markers: [{ left: "46%", label: "16 Jul · Third price cut" }, { left: "76%", label: "21 Jul · No goodwill scheme" }] },

  wc2026: { updated: "Updated 6 hours ago", explain: "The schedule is confirmed. Two further ticket sales phases are expected.", markers: [{ left: "36%", label: "8 Jul · Schedule confirmed" }, { left: "72%", label: "20 Jul · Ballot closed" }] },
  chandrayaan4: { updated: "Updated 11 hours ago", explain: "The mission is in final integration. The launch window has not been formally announced.", markers: [{ left: "34%", label: "2 Jul · Container qualified" }, { left: "78%", label: "23 Jul · Integration begun" }] },
  mumbaiflood: { updated: "Updated 35 minutes ago", explain: "A red alert is active and suburban services are partially suspended. The drainage programme status note is public.", markers: [{ left: "40%", label: "14 Jul · Drainage note" }, { left: "72%", label: "25 Jul · Red alert" }, { left: "88%", label: "26 Jul · Services suspended" }] },
  cop31: { updated: "Updated 4 days ago", explain: "The package is agreed. Disbursement schedules and additionality have not been published.", markers: [{ left: "50%", label: "12 Jul · Package agreed" }, { left: "76%", label: "14 Jul · Additionality queried" }] },

  bihar26: { updated: "Updated 2 hours ago", explain: "No poll schedule has been notified. Seat-sharing in both alliances remains unresolved.", markers: [{ left: "48%", label: "18 Jul · Talks extended" }, { left: "80%", label: "24 Jul · Schedule signalled" }] },
  oneelection: { updated: "Updated 5 hours ago", explain: "A committee report is tabled. No constitutional amendment has been introduced.", markers: [{ left: "56%", label: "22 Jul · Report tabled" }, { left: "84%", label: "25 Jul · States seek time" }] },
  delimitation: { updated: "Updated 10 hours ago", explain: "A consultation has been announced. The existing seat allocation freeze remains in force.", markers: [{ left: "42%", label: "10 Jul · Joint note" }, { left: "74%", label: "21 Jul · Consultation set" }] },
  oppalliance: { updated: "Updated 2 days ago", explain: "Talks are continuing. No seat-sharing arrangement has been announced.", markers: [{ left: "34%", label: "6 Jul · Draft programme" }, { left: "78%", label: "23 Jul · Meeting postponed" }] },

  upicharge: { updated: "Updated 25 minutes ago", explain: "A consultation paper is open for public comment. No charge has been approved or notified.", markers: [{ left: "48%", label: "21 Jul · Paper published" }, { left: "78%", label: "24 Jul · Scope clarified" }] },
  fourday: { updated: "Updated 8 hours ago", explain: "A voluntary pilot is open to private employers. No statutory change to working hours has been made.", markers: [{ left: "46%", label: "16 Jul · Draft framework" }, { left: "78%", label: "23 Jul · Pilot opened" }] },
  gigrules: { updated: "Updated 1 day ago", explain: "The rules are notified. The mechanism for disbursing benefits has not been finalised.", markers: [{ left: "52%", label: "20 Jul · Rules notified" }, { left: "84%", label: "25 Jul · Mechanism pending" }] },
  nep: { updated: "Updated 3 days ago", explain: "Implementation continues at state level. A credit transfer framework was notified in July.", markers: [{ left: "34%", label: "30 Jun · Review published" }, { left: "72%", label: "22 Jul · Credit framework" }] },

  "office-finance": { updated: "Updated 14 hours ago", explain: "Capital expenditure is running ahead of the budgeted path. The personal tax review has been deferred.", markers: [{ left: "40%", label: "11 Jul · Tax review deferred" }, { left: "72%", label: "19 Jul · Capex data" }] },
  "office-railways": { updated: "Updated 1 day ago", explain: "Quarterly punctuality figures show declines on three zones alongside two new premium routes.", markers: [{ left: "32%", label: "5 Jul · New routes" }, { left: "80%", label: "24 Jul · Punctuality report" }] },
  "office-cm-karnataka": { updated: "Updated 9 hours ago", explain: "The road restoration deadline has been revised again. Rural water milestones were reported this month.", markers: [{ left: "38%", label: "9 Jul · Water milestone" }, { left: "76%", label: "22 Jul · Deadline revised" }] },
  "office-opposition": { updated: "Updated 2 days ago", explain: "Session attendance and intervention counts are public. One adjournment motion was disallowed.", markers: [{ left: "46%", label: "17 Jul · Motion disallowed" }, { left: "80%", label: "23 Jul · Attendance published" }] },

  iitb: { updated: "Updated 1 day ago", explain: "Phase one aggregate counts are published. Department-level figures have not been released.", markers: [{ left: "34%", label: "5 Jul · Season opened" }, { left: "82%", label: "24 Jul · Phase one counts" }] },
  iima: { updated: "Updated 2 days ago", explain: "The revised fee applies to the incoming batch only. An expanded waiver pool was announced alongside it.", markers: [{ left: "44%", label: "14 Jul · Fee published" }, { left: "76%", label: "17 Jul · Waivers expanded" }] },
  "du-fyup": { updated: "Updated 2 days ago", explain: "The first four-year cohort has graduated. Postgraduate eligibility was clarified by circular in July.", markers: [{ left: "34%", label: "2 Jul · First cohort" }, { left: "72%", label: "18 Jul · Eligibility clarified" }] },
  nitt: { updated: "Updated 5 days ago", explain: "The laboratory block is commissioned. No announcement has been made on first-year hostel capacity.", markers: [{ left: "62%", label: "16 Jul · Lab block opens" }] },

  neet: { updated: "Updated 2 hours ago", explain: "A four-member panel is examining documented complaints. No finding has been published yet.", markers: [{ left: "18%", label: "6 May · Complaints acknowledged" }, { left: "46%", label: "11 May · Committee formed" }, { left: "74%", label: "19 May · Two arrests" }] },
  "upsc-key": { updated: "Updated 8 hours ago", explain: "The objection window has closed. Final keys and the commission's reasoning have not been published.", markers: [{ left: "44%", label: "15 Jul · Key released" }, { left: "80%", label: "24 Jul · Objections closed" }] },
  cuet: { updated: "Updated 6 days ago", explain: "Results have been published. Admission calendar changes for the next cycle have not been announced.", markers: [{ left: "40%", label: "9 Jul · Windows extended" }, { left: "72%", label: "14 Jul · Results published" }] },
  gate: { updated: "Updated 3 days ago", explain: "The objection window has closed. Final answer keys and scores have not yet been published.", markers: [{ left: "42%", label: "15 Jul · Key released" }, { left: "76%", label: "22 Jul · Objections closed" }] },

  "ms-abroad": { updated: "Updated 4 hours ago", explain: "Work-rights and dependant rules changed in several destinations during 2025-26. Outcomes differ sharply by intake year.", markers: [{ left: "36%", label: "3 Jul · Dependant rules" }, { left: "74%", label: "21 Jul · Work rights cut" }] },
  "mba-roi": { updated: "Updated 7 hours ago", explain: "Audited placement reports are available for several institutes. Consulting intake is down for a second year.", markers: [{ left: "38%", label: "8 Jul · Audited reports" }, { left: "74%", label: "20 Jul · Consulting intake" }] },
  "cse-glut": { updated: "Updated 3 hours ago", explain: "Approved intake rose again for the coming session while entry-level hiring stayed flat.", markers: [{ left: "44%", label: "12 Jul · Hiring survey" }, { left: "80%", label: "23 Jul · Intake approvals" }] },
  "govt-vs-private": { updated: "Updated 1 day ago", explain: "A consolidated recruitment calendar has been published for the coming year.", markers: [{ left: "66%", label: "19 Jul · Calendar published" }] },

  "delivery-fees": { updated: "Updated 50 minutes ago", explain: "Fees are set by the platforms and are not regulated. A competition complaint has been filed but no order has been passed.", markers: [{ left: "40%", label: "12 Jul · Regulator letter" }, { left: "78%", label: "24 Jul · Fee raised" }] },
  "cloud-kitchens": { updated: "Updated 5 hours ago", explain: "An inspection drive is under way. The listing-disclosure requirement is at proposal stage and is not yet binding.", markers: [{ left: "52%", label: "19 Jul · Disclosure proposed" }, { left: "86%", label: "26 Jul · Inspection drive" }] },
  "street-food-licensing": { updated: "Updated 1 day ago", explain: "Registration is open and vending zones are notified. Enforcement against unregistered carts has not yet begun.", markers: [{ left: "34%", label: "6 Jul · Registration opens" }, { left: "72%", label: "21 Jul · Zones notified" }] },
  "millet-menus": { updated: "Updated 3 days ago", explain: "Menu additions are voluntary. No pricing rules apply to them.", markers: [{ left: "58%", label: "15 Jul · Menus expanded" }] },

  blrmetro: { updated: "Updated 6 hours ago", explain: "Commercial service is deferred pending signalling certification. No revised opening date has been notified.", markers: [{ left: "34%", label: "28 Jun · Inspection set" }, { left: "68%", label: "20 Jul · Deferred to Q4" }] },
  "deepfake-ads": { updated: "Updated 1 hour ago", explain: "An enforcement inquiry is open and two platforms have been summoned. The labelling advisory is not yet binding.", markers: [{ left: "36%", label: "15 Jul · Advisory issued" }, { left: "66%", label: "22 Jul · Platforms summoned" }, { left: "88%", label: "26 Jul · Inquiry opened" }] },
  "coaching-safety": { updated: "Updated 12 hours ago", explain: "An inspection drive is under way and sealing notices have been issued. No revised sanctioning process has been announced.", markers: [{ left: "48%", label: "18 Jul · Drive begins" }, { left: "82%", label: "25 Jul · Sealing notices" }] },
  ainews: { updated: "Updated 1 day ago", explain: "Guidance is at draft stage. No binding disclosure requirement has been adopted by any regulator.", markers: [{ left: "38%", label: "12 Jul · Policies published" }, { left: "76%", label: "23 Jul · Draft guidance" }] },
};

export const DEFAULT_CONTEXT: TopicContext = {
  updated: "Updated recently",
  explain: "Editors are still publishing status detail for this topic.",
  markers: [{ left: "52%", label: "Status update" }],
};

export function contextFor(topicId: string): TopicContext {
  return TOPIC_CONTEXT[topicId] ?? DEFAULT_CONTEXT;
}
