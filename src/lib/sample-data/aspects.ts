/**
 * PROTOTYPE FIXTURES — NOT PRODUCTION DATA.
 *
 * Per-topic aspects: the sub-opinions that sit under the headline vote.
 *
 * These are deliberately specific to the topic rather than to its category —
 * "Did the second half hold up?" belongs to one film, not to films in general.
 * In production they are rows in an `Aspect` table written by an editor (or
 * proposed by an extraction agent and approved by one), and by participants
 * through the topic composer. The category sets in `lib/facets.ts` are only
 * a fallback for topics that never got their own.
 *
 * Every aspect offers exactly three answers, ordered positive → neutral →
 * negative, so answers still roll up into the headline distribution.
 */

import type { Facet } from "@/lib/types";

/**
 * Terse builder: id, label, question, then the three answers in tone order.
 *
 * Tone is about the *topic*, not about the answer's phrasing. The positive
 * slot always holds the reassuring answer — the one meaning "this is fine".
 * On a controversy that inverts the intuitive reading: believing an
 * allegation is the alarming answer, so "Credible" is the negative tone and
 * "Overblown" the positive one. Getting this backwards makes a topic's
 * aspects contradict its own headline.
 */
function a(
  id: string,
  label: string,
  prompt: string,
  pos: string,
  neu: string,
  neg: string,
): Facet {
  return {
    id,
    label,
    prompt,
    options: [
      { id: "pos", label: pos, tone: "Positive" },
      { id: "neu", label: neu, tone: "Neutral" },
      { id: "neg", label: neg, tone: "Negative" },
    ],
  };
}

export const ASPECTS: Record<string, Facet[]> = {
  /* ------------------------------------------------------ Entertainment */
  kalki2: [
    a("secondhalf", "The second half", "Did the second half hold up?", "Held up", "Sagged", "Fell apart"),
    a("world", "World-building", "Does the universe hold together?", "Coherent", "Confusing in places", "Incoherent"),
    a("runtime", "Runtime", "Was three hours and twelve minutes earned?", "Earned it", "Twenty minutes too long", "Bloated"),
    a("vfx", "Visual effects", "How did the effects hold up on a big screen?", "Seamless", "Uneven", "Rubbery"),
    a("imax", "Format upcharge", "Was the IMAX ticket worth the extra?", "Worth it", "Same in 2D", "Waste of money"),
  ],
  panchayat5: [
    a("finale", "The finale", "Did the ending earn five seasons of build-up?", "Earned it", "Mixed", "Let it down"),
    a("election", "The election arc", "Did the election subplot work?", "Worked", "Dragged", "Should have been cut"),
    a("tone", "Tone", "Has it kept the quietness that made it work?", "Kept it", "Slightly louder", "Lost it"),
    a("sendoffs", "Character send-offs", "Were the goodbyes handled well?", "Satisfying", "Uneven", "Rushed"),
    a("spinoff", "The spin-off", "Should they make the confirmed spin-off?", "Yes, make it", "Unsure", "Leave it here"),
  ],
  mirzapur4: [
    a("violence", "The violence", "Is the violence still doing narrative work?", "Purposeful", "Repetitive", "Gratuitous"),
    a("pacing", "Pacing", "Does the season hold its rhythm?", "Tight", "Slow in the middle", "Drags badly"),
    a("newcast", "New antagonist", "Did the new antagonist land?", "Excellent", "Serviceable", "Flat"),
    a("surprise", "Surprise", "Does it still surprise you?", "Often", "Occasionally", "Never"),
  ],
  arijittour: [
    a("setlist", "Setlist", "Did the setlist deliver?", "Perfect", "Played it safe", "Disappointing"),
    a("sound", "Sound at the venue", "How was the audio where you sat?", "Clear", "Patchy", "Unlistenable"),
    a("ticketing", "Ticketing", "How was the booking experience?", "Smooth", "Frustrating", "Completely broken"),
    a("price", "Price", "Was the ticket worth what you paid?", "Worth it", "Steep", "Daylight robbery"),
    a("crowd", "Crowd management", "Was the venue handled safely?", "Well handled", "Chaotic", "Genuinely unsafe"),
  ],

  /* -------------------------------------------------------------- Brands */
  netflixin: [
    a("price", "The price itself", "Is the new price defensible?", "Fair", "Steep", "Unjustifiable"),
    a("comms", "How it was communicated", "How did you find out, and was that acceptable?", "Clear and early", "Late", "Sneaked in"),
    a("catalogue", "Catalogue right now", "Is there enough on it to justify a subscription?", "Plenty", "Thinning", "Not worth it"),
    a("adtier", "The ad-supported tier", "Is the cheaper plan a real option?", "Perfectly usable", "Tolerable", "Unwatchable"),
    a("staying", "Are you staying", "What are you actually going to do?", "Keeping it", "Downgrading", "Cancelling"),
  ],
  zeptoten: [
    a("tenmin", "The ten-minute promise", "Does it actually arrive in ten minutes?", "Usually", "Sometimes", "Rarely"),
    a("rider", "Rider safety", "Is the time target safe for the person delivering?", "Handled responsibly", "Concerning", "Reckless"),
    a("pharmacy", "Medicines in ten minutes", "Should pharmacy items be on this clock?", "No problem", "Uneasy about it", "Should not be allowed"),
    a("pricing", "Price vs a local shop", "How does the bill compare?", "About the same", "Slightly more", "Much more"),
    a("accuracy", "Order accuracy", "Do you get what you ordered?", "Accurate", "Occasional errors", "Frequently wrong"),
  ],
  airindia: [
    a("cabin", "Refitted cabins", "How is the cabin on a retrofitted aircraft?", "Transformed", "Better than before", "Still poor"),
    a("ife", "In-flight entertainment", "Did the screen and system work?", "Worked fine", "Hit or miss", "Broken"),
    a("crew", "Crew service", "How were you treated on board?", "Excellent", "Fine", "Indifferent"),
    a("ontime", "On-time performance", "Did it leave and arrive when it said?", "Reliable", "Slipping", "Consistently late"),
    a("choose", "Would you choose them", "At the same fare as a rival, who gets your booking?", "Them", "Depends on timing", "The rival"),
  ],
  starbucksin: [
    a("price", "The reset pricing", "Is the new pricing reasonable?", "Reasonable", "Still steep", "Overpriced"),
    a("quality", "Drink quality", "Is what you get consistent?", "Consistent", "Variable", "Poor"),
    a("space", "As a place to sit", "Can you actually work or meet there?", "Comfortably", "Crowded", "Unusable"),
    a("menu", "Local menu additions", "Are the India-specific items any good?", "Genuinely good", "Gimmicky", "Bad"),
  ],

  /* -------------------------------------------------------------- Sports */
  t20squad: [
    a("spin", "Three specialist spinners", "Is the spin-heavy attack the right call?", "Right call", "Risky", "Wrong for the conditions"),
    a("omissions", "The two omissions", "Were the dropped batters treated fairly?", "Justified", "Harsh but defensible", "Indefensible"),
    a("middle", "Middle order", "Is the middle order settled?", "Settled", "Fragile", "A real problem"),
    a("captain", "Captaincy", "Is the leadership call right?", "Right", "Acceptable", "Wrong"),
    a("chances", "Chances at the tournament", "How far does this squad go?", "Favourites", "Semi-finals", "Early exit"),
  ],
  impactplayer: [
    a("allrounders", "Effect on all-rounders", "Has the rule devalued the genuine all-rounder?", "No real harm", "Some", "Real damage"),
    a("spectacle", "Effect on the spectacle", "Is the cricket better to watch?", "Better", "No change", "Worse"),
    a("keep", "Should it stay", "What should the review decide?", "Keep it", "Modify it", "Scrap it"),
    a("fairness", "Fairness across teams", "Does it favour some squads over others?", "Fair", "Slight edge", "Clearly unfair"),
  ],
  isleague: [
    a("principle", "Promotion and relegation", "Is an open league the right model?", "Essential", "Nice to have", "Unnecessary"),
    a("timeline", "The 2028 start", "Is the timeline right?", "Right", "Too slow", "Too soon"),
    a("franchise", "Effect on franchises", "Can investor clubs absorb the risk?", "Manageable", "Painful", "Fatal for some"),
    a("legacy", "Effect on legacy clubs", "Does this help the old clubs?", "Revives them", "Some help", "Too late"),
  ],
  olympicbid: [
    a("host", "Should India host", "Is hosting the right ambition?", "Yes", "Unsure", "No"),
    a("city", "Ahmedabad as host", "Is the host city the right choice?", "Right choice", "Debatable", "Wrong choice"),
    a("cost", "Cost against benefit", "Do the numbers justify it?", "Worth it", "Uncertain", "Not worth it"),
    a("athletes", "Athlete pipeline", "Will the athletes be ready by 2036?", "On track", "Behind", "Nowhere near"),
    a("legacy", "Venue legacy", "What happens to the venues afterwards?", "Properly planned", "Vague", "They will rot"),
  ],

  /* ---------------------------------------------------------- Technology */
  iphone18: [
    a("price", "India launch price", "Is the price defensible?", "Acceptable", "Steep", "Absurd"),
    a("assembly", "Local assembly", "Did assembling here benefit buyers at all?", "Real benefit", "Marginal", "None whatsoever"),
    a("upgrade", "Upgrade over last year", "Is there a reason to replace last year's model?", "Meaningful", "Incremental", "Nothing new"),
    a("camera", "Camera", "How is the camera in real use?", "Best in class", "Comparable to rivals", "Overhyped"),
    a("battery", "Battery", "Does it last a full day?", "All day", "Just about", "Poor"),
  ],
  jioai: [
    a("default", "On by default", "Is opt-out rather than opt-in acceptable?", "Fine", "Uncomfortable", "Not acceptable"),
    a("useful", "Usefulness", "Does it actually help you day to day?", "Genuinely useful", "Occasionally", "Useless"),
    a("data", "Data retention terms", "Are you comfortable with the terms?", "Comfortable", "Unclear to me", "Not comfortable"),
    a("languages", "Indian language support", "How well does it work in your language?", "Excellent", "Patchy", "Poor"),
    a("optout", "Opting out", "How easy is it to turn off?", "Easy", "Buried in settings", "Near impossible"),
  ],
  iplstream: [
    a("peak", "Picture at peak concurrency", "How did it hold up in the closing overs?", "Held up", "Noticeably dropped", "Unwatchable"),
    a("latency", "Latency against TV", "How far behind the broadcast were you?", "Ahead of TV", "About level", "Far behind"),
    a("ads", "Ad load", "How was the advertising volume?", "Acceptable", "Heavy", "Intolerable"),
    a("credit", "Compensation", "Do subscribers deserve something for the outages?", "Not needed", "Should be offered", "Clearly owed"),
    a("renew", "Next season", "Would you pay for it again?", "Yes", "Unsure", "No"),
  ],
  evprice: [
    a("cuts", "The price cuts", "How do the reductions read to you?", "Great news", "Just market forces", "Something is off"),
    a("owners", "Treatment of existing owners", "Was the handling of earlier buyers acceptable?", "Acceptable", "Poor", "Unacceptable"),
    a("charging", "Charging network", "Is the charging infrastructure ready where you live?", "Ready", "Improving", "Not ready"),
    a("resale", "Resale confidence", "How confident are you about residual value?", "Confident", "Unsure", "Worried"),
    a("buynow", "Would you buy now", "Is this the moment to switch?", "Yes", "Waiting for the next cut", "No"),
  ],

  /* ------------------------------------------------ Events (nat. & intl.) */
  wc2026: [
    a("format", "The 48-team format", "Does expansion improve the tournament?", "Better", "Neutral", "Diluted"),
    a("tickets", "Ticket pricing", "Is dynamic pricing acceptable for a World Cup?", "Fair enough", "Steep", "Exploitative"),
    a("timings", "Kick-off times", "How do the times work for you?", "Good", "Manageable", "Terrible"),
    a("logistics", "Three host nations", "Does spreading it across three countries work?", "Works fine", "Messy", "A bad idea"),
    a("excitement", "Excitement level", "How much are you looking forward to it?", "Very", "Somewhat", "Not at all"),
  ],
  chandrayaan4: [
    a("priority", "Spending priority", "Is this the right call on public money?", "Right priority", "Debatable", "Wrong priority"),
    a("confidence", "Confidence in success", "How likely is the sample return to work?", "Confident", "Cautiously hopeful", "Doubtful"),
    a("budget", "Budget transparency", "Is enough being disclosed about the cost?", "Adequate", "Thin", "Absent"),
    a("value", "Long-term value", "What does this unlock?", "A great deal", "Some", "Little"),
  ],
  mumbaiflood: [
    a("response", "Civic response", "How fast was the response on the ground?", "Fast", "Slow", "Effectively absent"),
    a("drainage", "The drainage programme", "Has the funded upgrade delivered anything?", "Working", "Partially", "Failed outright"),
    a("alerts", "Warnings and alerts", "Were you told in time?", "Timely", "Late", "Useless"),
    a("rail", "Rail suspension handling", "How was the suburban shutdown managed?", "Handled well", "Poorly", "Chaotic"),
    a("accountability", "Accountability", "Has anyone answered for it?", "Some have", "Minimal", "Nobody"),
  ],
  cop31: [
    a("size", "Size of the package", "Is the headline figure enough?", "Adequate", "Insufficient", "Token"),
    a("new", "How much is new money", "Is any of it genuinely additional?", "Mostly new", "Partly", "Almost none"),
    a("binding", "Enforceability", "Will anyone be held to it?", "Binding enough", "Weak", "Meaningless"),
    a("india", "India's outcome", "How did India come out of it?", "Well", "Mixed", "Poorly"),
  ],

  /* -------------------------------------------------- National Politics */
  bihar26: [
    a("issues", "Campaign issues", "Is the campaign about the right things?", "The right things", "Mixed", "Entirely the wrong things"),
    a("seats", "Seat-sharing delays", "How do you read the repeated delays?", "Understandable", "Frustrating", "Disqualifying"),
    a("turnout", "Turnout", "How many people will actually vote?", "High", "Average", "Low"),
    a("clean", "A clean count", "How much faith do you have in the process?", "Confident", "Some doubts", "None"),
    a("migration", "Migration and jobs", "Is the migration question getting the space it deserves?", "Yes", "Partly", "Being ignored"),
  ],
  oneelection: [
    a("savings", "The cost argument", "Is the savings case convincing?", "Convincing", "Overstated", "Beside the point"),
    a("terms", "Curtailing assembly terms", "Is shortening sitting mandates acceptable?", "Acceptable", "Troubling", "Unacceptable"),
    a("regional", "Effect on regional parties", "What does it do to state-level politics?", "Little", "Some harm", "Serious harm"),
    a("governance", "Governance continuity", "Does permanent campaigning actually end?", "It improves", "No change", "It gets worse"),
  ],
  delimitation: [
    a("principle", "One person, one vote", "Should representation follow population alone?", "It must", "Needs balancing", "Cannot apply alone"),
    a("penalty", "Penalising success", "Is it fair for states that stabilised population to lose seats?", "Unavoidable", "Unfair", "Indefensible"),
    a("freeze", "Extending the freeze", "Should the existing freeze continue?", "Yes, extend", "As a stopgap", "No, it must end"),
    a("trust", "The consultation", "Will the consultation be genuine?", "Confident", "Unsure", "No faith in it"),
  ],
  oppalliance: [
    a("credible", "Credibility", "Is this a credible alternative?", "Credible", "Fragile", "Not credible"),
    a("deadlines", "The missed deadlines", "How much do the delays matter?", "Understandable", "Poor", "A shambles"),
    a("programme", "Common minimum programme", "Is there substance in the draft?", "Substantive", "Vague", "Empty"),
    a("leadership", "Leadership clarity", "Is it clear who leads it?", "Clear", "Unclear", "Nobody knows"),
  ],

  /* ------------------------------------------------ Government Policies */
  upicharge: [
    a("threshold", "Charging above a threshold", "Are merchant-side charges on large payments reasonable?", "Reasonable", "Depends on the threshold", "Unacceptable"),
    a("small", "Risk to small traders", "What does this do to a tea stall or a kirana shop?", "Little", "A real risk", "Would push them to cash"),
    a("clarity", "Clarity of the paper", "Is the proposal clearly written?", "Clear", "Vague", "Deliberately vague"),
    a("passthrough", "Will costs reach you", "Do merchant charges end up on the customer?", "No", "Probably", "Certainly"),
    a("timing", "Timing", "Is now the moment to touch UPI pricing?", "Fine", "Poor", "The worst possible time"),
  ],
  fourday: [
    a("principle", "The idea itself", "Is a four-day week worth pursuing?", "Strong idea", "Worth testing", "Bad idea"),
    a("pay", "Pay protection", "Are the pay conditions strong enough?", "Adequate", "Weak", "Missing entirely"),
    a("shift", "Shift and factory work", "Does it work outside desk jobs?", "Workable", "Hard", "Impossible"),
    a("uptake", "Employer uptake", "How many employers will actually join?", "Many", "A handful", "Almost none"),
    a("output", "Your own output", "What would it do to your work?", "It would improve", "No change", "It would suffer"),
  ],
  gigrules: [
    a("rate", "Contribution rate", "Is the aggregator contribution enough?", "Adequate", "Too low", "Token"),
    a("disburse", "Disbursement", "Will the money reach workers?", "It will", "Unclear", "It will not"),
    a("coverage", "Who counts as a gig worker", "Is the definition broad enough?", "Broad enough", "Has gaps", "Far too narrow"),
    a("earnings", "Effect on earnings", "What happens to take-home pay?", "It improves", "No change", "It falls"),
  ],
  nep: [
    a("structure", "Multidisciplinary structure", "Is the new structure an improvement?", "Yes", "Mixed", "No"),
    a("states", "Consistency across states", "Does it mean the same thing everywhere?", "Broadly", "Uneven", "Chaotic"),
    a("credits", "Credit transfer in practice", "Does the credit framework actually work?", "It works", "Partly", "Not at all"),
    a("teachers", "Teacher readiness", "Are teachers equipped for it?", "Ready", "Getting there", "Unprepared"),
    a("mobility", "Moving between states", "What happens to a student who relocates?", "They are fine", "It is difficult", "They lose a year"),
  ],

  /* --------------------------------------------------------- Politicians */
  "office-finance": [
    a("capex", "Capital expenditure", "Is infrastructure spending being delivered?", "Ahead of plan", "On track", "Behind"),
    a("tax", "Personal tax relief", "What happened to the promised relief?", "Delivered", "Delayed", "Quietly abandoned"),
    a("burden", "Who carries the burden", "Is the tax burden fairly distributed?", "Fairly", "Tilted", "Unfair to salaried filers"),
    a("inflation", "Inflation management", "How is price pressure being handled?", "Competently", "Mixed", "Badly"),
    a("transparency", "Budget transparency", "Is enough being disclosed?", "Open", "Partial", "Opaque"),
  ],
  "office-railways": [
    a("safety", "Safety record", "Has safety improved?", "Improved", "Unchanged", "Worse"),
    a("punctuality", "Punctuality on ordinary trains", "Does your regular train run on time?", "Usually", "Slipping", "Rarely"),
    a("priority", "Premium against ordinary", "Are the priorities right?", "Balanced", "Tilted to premium", "Wrong priorities"),
    a("stations", "Station modernisation", "Has anything changed at your station?", "Visibly", "Patchy", "Cosmetic only"),
    a("booking", "Booking and refunds", "How is the booking experience?", "Smooth", "Frustrating", "Broken"),
  ],
  "office-cm-karnataka": [
    a("roads", "Bengaluru roads", "What is the state of the roads you use?", "Improving", "Unchanged", "Worse"),
    a("water", "Water supply", "Is supply reliable where you live?", "Reliable", "Patchy", "Failing"),
    a("metro", "Metro timelines", "Are the corridor deadlines being met?", "Being met", "Slipping", "Effectively abandoned"),
    a("rural", "Rural delivery", "How is delivery outside the city?", "Strong", "Mixed", "Weak"),
    a("responsive", "Responsiveness", "Do complaints get anywhere?", "Responsive", "Slow", "Ignored"),
  ],
  "office-opposition": [
    a("quality", "Quality of interventions", "Are the parliamentary interventions substantive?", "Substantive", "Mixed", "Weak"),
    a("disruption", "Use of disruption", "Do the walkouts and adjournments help?", "Justified", "Overused", "Counterproductive"),
    a("attendance", "Attendance and preparation", "Is the work being put in?", "Yes", "Adequate", "No"),
    a("alternative", "An actual alternative", "Is there a clear alternative programme?", "Clear", "Vague", "None"),
  ],

  /* ------------------------------------------------------------ Colleges */
  iitb: [
    a("outcomes", "Outcomes against reputation", "Do placements match what the name promises?", "They match", "Slightly below", "Well below"),
    a("departments", "Gap between departments", "How wide is the gap across branches?", "Small", "Noticeable", "Severe"),
    a("transparency", "Placement data", "Is the reporting transparent?", "Transparent", "Partial", "Hidden"),
    a("prep", "Preparation support", "Does the institute prepare you for the process?", "Strongly", "Adequately", "Barely"),
    a("noncs", "Non-CS branches", "How are core-engineering outcomes?", "Fine", "Struggling", "Poor"),
  ],
  iima: [
    a("feevalue", "Fee against outcome", "Is the revised fee justified by the outcome?", "Justified", "Borderline", "Not justified"),
    a("aid", "Financial aid reach", "Does the expanded waiver pool reach enough people?", "Meaningful", "Token", "Negligible"),
    a("loan", "Loan risk", "How heavy is the debt for an average student?", "Manageable", "Heavy", "Dangerous"),
    a("teaching", "Teaching quality", "Is the teaching worth the name?", "Excellent", "Good", "Overrated"),
    a("takeit", "Would you take the seat", "At this fee, would you still enrol?", "Yes", "Unsure", "No"),
  ],
  "du-fyup": [
    a("fourth", "The fourth year", "Is the extra year worth taking?", "Worth it", "Unclear", "A wasted year"),
    a("cost", "Cost of an extra year", "Can families absorb another year of fees and rent?", "Manageable", "Heavy", "Prohibitive"),
    a("pgclarity", "Postgraduate eligibility", "Is the masters eligibility question settled?", "Resolved", "Partly", "Still a mess"),
    a("research", "Research exposure", "Is the research component real?", "Genuine", "Superficial", "Nonexistent"),
    a("departments", "Departmental readiness", "Are departments equipped for it?", "Ready", "Uneven", "Unprepared"),
  ],
  nitt: [
    a("labs", "The new laboratory block", "How good is the new facility?", "Excellent", "Good", "Overstated"),
    a("hostel", "First-year hostels", "What are the residential conditions like?", "Fine", "Cramped", "Unacceptable"),
    a("library", "Library and study space", "Is there room to work?", "Ample", "Adequate", "Always short"),
    a("mess", "Mess food", "How is the food?", "Good", "Edible", "Poor"),
    a("support", "Safety and support", "Is student support there when needed?", "Strong", "Adequate", "Weak"),
  ],

  /* --------------------------------------------------------------- Exams */
  neet: [
    a("credibility", "Credibility of the claims", "How believable are the leak allegations?", "Overblown", "Unproven either way", "Credible"),
    a("response", "The agency's response", "How has the testing agency handled it?", "Adequately", "Slowly", "Evasively"),
    a("reexam", "A re-examination", "Should the paper be held again?", "Not needed", "Only affected centres", "Yes, in full"),
    a("merit", "Confidence in the merit list", "Do you trust this year's ranks?", "I trust them", "Doubtful", "Not at all"),
    a("grievance", "Grievance process", "Do complaints go anywhere?", "They are handled", "Slowly", "They are ignored"),
  ],
  "upsc-key": [
    a("fairness", "The disputed questions", "How many of the nine are genuinely wrong?", "None — the key is fine", "Two or three", "Most of them"),
    a("reasoning", "Publishing the reasoning", "Should the commission explain its decisions?", "Not necessary", "It should", "It must"),
    a("fee", "Objection fee", "Is the per-question fee reasonable?", "Reasonable", "Steep", "A barrier to challenging"),
    a("standard", "Overall paper standard", "How was the paper as a test?", "High standard", "Average", "Poor"),
  ],
  cuet: [
    a("delay", "The nineteen-day delay", "How serious was the delay?", "Understandable", "Unacceptable", "Genuinely damaging"),
    a("admissions", "Effect on admissions", "Did it cost anyone a seat?", "Minimal effect", "A real effect", "It cost people seats"),
    a("comms", "Communication during it", "Were candidates kept informed?", "Adequately", "Poorly", "Total silence"),
    a("normalisation", "Normalisation across slots", "Is the cross-slot scoring fair?", "Fair", "Questionable", "Unfair"),
    a("nextyear", "Next year's calendar", "Will the calendar hold next cycle?", "Confident", "Unsure", "No confidence"),
  ],
  gate: [
    a("core", "The core section", "Was the core section fairly pitched?", "Fair", "Hard but fair", "Unreasonable"),
    a("precision", "The four precision questions", "What should happen to the flagged questions?", "Leave them", "Award marks to all", "Drop them entirely"),
    a("aptitude", "Aptitude section", "How was the aptitude half?", "Well pitched", "Easy", "Trivial"),
    a("syllabus", "Syllabus alignment", "Did it match what was prescribed?", "Matched", "Mostly", "Off-syllabus in places"),
    a("overall", "Overall fairness", "Was it a fair test?", "Fair", "Mixed", "Unfair"),
  ],

  /* ------------------------------------------------------ Career Streams */
  "ms-abroad": [
    a("worth", "Worth it today", "At 2026 fees and 2026 visa rules, is it worth it?", "Worth it", "Marginal", "Not worth it"),
    a("visa", "Visa and work-rights risk", "How much risk are you taking on?", "Manageable", "High", "Too high to accept"),
    a("selffunded", "Self-funded taught masters", "Does a self-funded taught programme still make sense?", "Still viable", "Only for some", "Avoid it"),
    a("loan", "Clearing the loan", "How long to pay it back?", "Quickly", "Slowly", "You may not"),
    a("advise", "Would you advise it", "Would you tell someone to go this year?", "Yes", "With heavy caveats", "No"),
  ],
  "mba-roi": [
    a("tier1", "ROI at tier-one", "Does a top-tier programme still pay back?", "Strongly", "Moderately", "Weakly"),
    a("beyond", "ROI outside tier-one", "And outside the top schools?", "Acceptable", "Thin", "Negative"),
    a("reports", "Placement reports", "Are the published numbers honest?", "Honest", "Selective", "Misleading"),
    a("switch", "As a career switch", "Does it work for changing function or geography?", "Very well", "Somewhat", "Not really"),
    a("fees", "Fees against outcome", "Is the fee defensible against the median outcome?", "Justified", "Stretched", "Indefensible"),
  ],
  "cse-glut": [
    a("real", "Is the oversupply real", "Is there genuinely a seat glut?", "Not real", "Overstated", "It is real"),
    a("cyclical", "Cyclical or structural", "Is this a downturn or a permanent shift?", "Cyclical", "Too early to say", "Structural"),
    a("tier3", "A tier-three CS degree", "Is it still worth taking today?", "Still worth it", "Marginal", "Not worth it"),
    a("cap", "Capping intake", "Should approved intake be limited?", "No, leave it open", "Partly", "Yes, cap it"),
    a("advice", "Advice to a 2026 entrant", "What would you tell someone joining now?", "Go for it", "Think hard", "Pick something else"),
  ],
  "govt-vs-private": [
    a("security", "Job security", "How much does security actually count for?", "A decisive advantage", "Some advantage", "Overrated"),
    a("ceiling", "The pay ceiling", "How much does the ceiling matter?", "Acceptable", "Limiting", "A dealbreaker"),
    a("years", "Years spent preparing", "How many attempts are worth it?", "As many as it takes", "Cap it at three", "Do not start"),
    a("balance", "Work-life balance", "Is the balance genuinely better?", "Much better", "Somewhat better", "No different"),
    a("advise", "Would you advise it today", "Would you point someone at the exam route now?", "Yes", "Only with a backup", "No"),
  ],

  /* --------------------------------------------------------- Food & Dining */
  "delivery-fees": [
    a("transparency", "Price transparency", "Does the menu price resemble what you pay?", "It matches", "Roughly", "Nowhere close"),
    a("worth", "Worth the convenience", "Is the total still worth not cooking?", "Worth it", "Borderline", "Not any more"),
    a("restaurant", "What the restaurant gets", "Is the split with restaurants fair?", "Fair", "Unclear", "Unfair"),
    a("alternatives", "Ordering direct", "Would you call the restaurant instead?", "Already do", "Considering it", "Too much hassle"),
    a("keepusing", "Will you keep using it", "Are you still ordering next month?", "Yes", "Less often", "Stopping"),
  ],
  "cloud-kitchens": [
    a("trust", "Trust in the kitchen", "Do you trust food from a kitchen with no shopfront?", "Yes", "Unsure", "No"),
    a("disclosure", "Disclosure", "Should the operating kitchen be named on every listing?", "Not needed", "Would help", "Must be required"),
    a("severity", "Severity of the findings", "How serious are the violations?", "Isolated", "Widespread", "Systemic"),
    a("enforcement", "Enforcement", "Are the inspections doing real work?", "Effective", "Cosmetic", "Far too late"),
  ],
  "street-food-licensing": [
    a("hygiene", "Effect on hygiene", "Will licensing actually make the food safer?", "Yes", "Marginally", "No"),
    a("vendors", "Effect on vendors", "What does it do to the smallest carts?", "Manageable", "Hard", "Prices them out"),
    a("zoning", "Vending zones", "Are the fixed zones sensibly placed?", "Sensible", "Debatable", "Badly chosen"),
    a("character", "The food itself", "Does regulation change what makes street food good?", "No change", "Some", "Ruins it"),
  ],
  "millet-menus": [
    a("taste", "Taste", "Are the dishes actually good?", "Genuinely good", "Fine", "Poor"),
    a("pricing", "Pricing", "Is the premium justified?", "Justified", "Steep", "Unjustifiable"),
    a("authenticity", "Menu placement", "Do they feel like real dishes or a box-ticking exercise?", "Real dishes", "Mixed", "Box-ticking"),
    a("order", "Would you order it", "Are you choosing it over rice or wheat?", "Yes", "Occasionally", "No"),
  ],

  /* ------------------------------------------------------- Places & Travel */
  tajmahal: [
    a("queue", "Getting in", "How was the queue and security check?", "Quick", "Slow but moving", "Chaotic"),
    a("touts", "Touts & guides", "Were you hassled outside the complex?", "Left alone", "Some pestering", "Relentless"),
    a("platform", "The mausoleum charge", "Is the extra charge for the main platform justified?", "Worth it", "Debatable", "A shakedown"),
    a("timing", "Time of day", "Did the slot you booked show it well?", "Perfect light", "Fine", "Wrong time entirely"),
    a("upkeep", "Condition of the monument", "How is it being maintained?", "Immaculate", "Showing wear", "Poorly kept"),
  ],
  "goa-season": [
    a("shackprice", "Shack pricing", "Was the beach shack bill reasonable?", "Reasonable", "Steep", "Absurd"),
    a("taxi", "Getting around", "How was local transport?", "Manageable", "Expensive", "A racket"),
    a("beach", "The beaches themselves", "How were the beaches when you went?", "Clean and calm", "Crowded", "Unpleasant"),
    a("value", "Against the alternatives", "Better value than flying to Sri Lanka or Thailand?", "Still better", "About the same", "Worse"),
  ],
  "manali-traffic": [
    a("drive", "The drive up", "How was the approach road?", "Clear", "Slow in stretches", "Gridlocked"),
    a("cap", "Entry caps", "Should visitor numbers be capped on peak weekends?", "Cap them", "Unsure", "Leave it open"),
    a("crowd", "On the ground", "Was the town itself pleasant?", "Pleasant", "Busy", "Overrun"),
    a("stay", "Where you stayed", "Did the stay match what was advertised?", "Matched", "Roughly", "Nothing like it"),
  ],
  "alleppey-houseboats": [
    a("boat", "The boat itself", "Did the boat match the listing?", "Matched it", "Roughly", "Nothing like the photos"),
    a("food", "Food on board", "How was the cooking?", "Excellent", "Fine", "Poor"),
    a("water", "The backwaters", "How did the water and banks look?", "Clean", "Patchy", "Visibly polluted"),
    a("agent", "Booking through an agent", "Was the agent worth what they took?", "Worth it", "Unnecessary", "Actively misleading"),
    a("crew", "Crew", "How were you looked after?", "Attentive", "Fine", "Neglectful"),
  ],
  "corbett-safari": [
    a("permit", "Getting a permit", "Could you book at official rates?", "Booked at face value", "Paid a markup", "Impossible without an operator"),
    a("sighting", "What you saw", "Was the wildlife worth the trip?", "Worth it", "Quiet day", "Barely anything"),
    a("vehicles", "Vehicles per zone", "Were there too many jeeps in your zone?", "Well spaced", "Busy", "A convoy"),
    a("guide", "The guide", "How was your assigned guide?", "Knowledgeable", "Adequate", "Disinterested"),
    a("markup", "Operator pricing", "Is the operator markup defensible?", "Defensible", "Steep", "Profiteering"),
  ],
  "hotel-hidden-charges": [
    a("gap", "Search price vs final price", "How far apart were they?", "Same", "A little higher", "Far higher"),
    a("timing", "When you were told", "When did the extra charges appear?", "Up front", "At checkout", "On the bill at the property"),
    a("mandatory", "Resort & destination fees", "Are unavoidable fees defensible?", "Defensible", "Depends", "Should be illegal"),
    a("blame", "Who is responsible", "Who do you hold responsible for the gap?", "Neither, it's clear enough", "The aggregator", "The hotel"),
  ],

  /* -------------------------------------------------------- Controversies */
  blrmetro: [
    a("explanation", "The explanation given", "Is the stated reason for the delay adequate?", "Adequate", "Thin", "Not credible"),
    a("safety", "Safety-first justification", "Is 'pending certification' a fair reason to wait?", "Accept it", "Partly", "An excuse"),
    a("comms", "Communication with commuters", "Have commuters been told what is happening?", "Clearly", "Poorly", "Not at all"),
    a("q4", "The Q4 date", "Will it open this quarter?", "Confident", "Doubtful", "No chance"),
    a("accountability", "Accountability", "Has anyone answered for three missed dates?", "Some have", "Minimally", "Nobody"),
  ],
  "deepfake-ads": [
    a("platform", "Platform responsibility", "Are the platforms doing enough?", "Doing enough", "Not enough", "Negligent"),
    a("verification", "Advertiser verification", "Is the checking on ad buyers adequate?", "Adequate", "Weak", "Effectively absent"),
    a("takedown", "Takedown speed", "How fast do reported ads come down?", "Fast enough", "Slow", "They come back anyway"),
    a("risk", "Risk to ordinary people", "How much harm is this causing?", "Limited", "Real", "Severe"),
    a("inquiry", "The enforcement inquiry", "Will the inquiry change anything?", "Yes", "Unclear", "Nothing will change"),
  ],
  "coaching-safety": [
    a("severity", "Severity", "How widespread are the violations?", "Isolated cases", "Widespread", "Systemic"),
    a("drive", "The inspection drive", "Is the enforcement drive doing real work?", "Effective", "Cosmetic", "Far too late"),
    a("sanction", "The sanctioning process", "How did these centres get approved at all?", "Process is sound", "Weak", "Broken"),
    a("parents", "Checking a centre", "Can a parent verify a centre before enrolling?", "Easily", "With difficulty", "Not at all"),
    a("change", "Will anything change", "In a year, will this be different?", "Yes", "Somewhat", "Nothing will change"),
  ],
  ainews: [
    a("byline", "Machine copy under a human byline", "Is that acceptable practice?", "Acceptable", "Depends on the piece", "Not acceptable"),
    a("disclosure", "Current disclosure", "Are readers being told?", "Adequately", "Patchily", "Not at all"),
    a("accuracy", "Accuracy", "How reliable is machine-assisted reporting?", "Reliable", "Mixed", "Unreliable"),
    a("jobs", "Effect on newsroom jobs", "What does this do to reporting jobs?", "Little", "Some loss", "Significant loss"),
    a("trust", "Trust in the publication", "Has this changed how you read them?", "Unchanged", "Reduced", "Badly damaged"),
  ],
};
