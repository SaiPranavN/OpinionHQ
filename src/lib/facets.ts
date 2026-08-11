/**
 * Category-specific opinion dimensions.
 *
 * A single up/neutral/down vote is a weak instrument: "how do you feel about
 * this film" and "how do you feel about this exam" are not the same question.
 * Each topic type therefore asks four or five one-click questions that match
 * what people actually argue about, and every answer carries a sentiment tone
 * so the responses still roll up into the headline distribution.
 */

import type {
  CategoryId,
  Facet,
  FacetOption,
  FacetSetId,
  Sentiment,
} from "@/lib/types";

/** Shorthand: three options, ordered positive → neutral → negative. */
function opts(
  positive: string,
  neutral: string,
  negative: string,
): [FacetOption, FacetOption, FacetOption] {
  const tone = (t: Sentiment) => t;
  return [
    { id: "pos", label: positive, tone: tone("Positive") },
    { id: "neu", label: neutral, tone: tone("Neutral") },
    { id: "neg", label: negative, tone: tone("Negative") },
  ];
}

function facet(id: string, label: string, prompt: string, o: FacetOption[]): Facet {
  return { id, label, prompt, options: o };
}

export const FACET_SETS: Record<FacetSetId, Facet[]> = {
  film: [
    facet("story", "Story & screenplay", "How was the writing?", opts("Gripping", "Uneven", "Weak")),
    facet("acting", "Performances", "How did the cast do?", opts("Outstanding", "Serviceable", "Disappointing")),
    facet("music", "Music & songs", "Did the soundtrack land?", opts("Memorable", "Forgettable", "Grating")),
    facet("visuals", "Cinematography & VFX", "How did it look?", opts("Stunning", "Fine", "Flat")),
    facet("value", "Worth the ticket", "Would you tell a friend to watch it in a theatre?", opts("Yes, go", "Wait for streaming", "Skip it")),
  ],
  series: [
    facet("writing", "Writing", "How is the writing this season?", opts("Sharp", "Patchy", "Weak")),
    facet("pacing", "Pacing", "Does it hold its rhythm?", opts("Tight", "Slow in parts", "Drags badly")),
    facet("cast", "Performances", "How is the cast?", opts("Excellent", "Fine", "Off")),
    facet("ending", "Payoff", "Did the season earn its ending?", opts("Earned it", "Mixed", "Fell apart")),
  ],
  brand: [
    facet("value", "Value for money", "Is the price fair for what you get?", opts("Fair", "Borderline", "Overpriced")),
    facet("quality", "Product quality", "How does it hold up in use?", opts("Reliable", "Inconsistent", "Poor")),
    facet("service", "Customer service", "How were you treated when something went wrong?", opts("Helpful", "Slow", "Unhelpful")),
    facet("trust", "Trust", "Would you buy from them again?", opts("Yes", "Unsure", "No")),
  ],
  sports: [
    facet("performance", "Team performance", "How are they actually playing?", opts("Excellent", "Inconsistent", "Poor")),
    facet("leadership", "Captaincy & coaching", "Are the calls being made well?", opts("Sharp", "Mixed", "Baffling")),
    facet("selection", "Selection", "Is the right side being picked?", opts("Fair", "Debatable", "Indefensible")),
    facet("entertainment", "Watchability", "Is it good to watch?", opts("Thrilling", "Watchable", "Dull")),
    facet("officiating", "Officiating", "Were the decisions sound?", opts("Sound", "Inconsistent", "Poor")),
  ],
  gadget: [
    facet("value", "Value for money", "Is it worth the asking price?", opts("Worth it", "Borderline", "Overpriced")),
    facet("build", "Build & design", "How does the hardware feel?", opts("Premium", "Ordinary", "Cheap")),
    facet("performance", "Performance", "Does it do the job well?", opts("Fast", "Adequate", "Struggles")),
    facet("battery", "Battery & reliability", "Does it last?", opts("All day", "Just about", "Poor")),
    facet("software", "Software & updates", "How is the software side?", opts("Clean", "Bloated but usable", "A mess")),
  ],
  platform: [
    facet("reliability", "Reliability", "Does it work when you need it?", opts("Solid", "Occasional issues", "Frequently broken")),
    facet("pricing", "Pricing", "Is what you pay reasonable?", opts("Reasonable", "Getting steep", "Unjustified")),
    facet("privacy", "Privacy & data use", "Are you comfortable with how they use your data?", opts("Comfortable", "Unsure", "Not comfortable")),
    facet("support", "Support", "Can you get a real answer from them?", opts("Yes", "Eventually", "No")),
  ],
  event: [
    facet("organisation", "Organisation", "How well was it run?", opts("Well run", "Rough edges", "Badly run")),
    facet("safety", "Public safety", "Were people kept safe?", opts("Handled well", "Some concerns", "Serious lapses")),
    facet("coverage", "Media coverage", "Was the reporting fair?", opts("Fair", "Patchy", "Distorted")),
    facet("impact", "Lasting impact", "Will it matter in a year?", opts("Significant", "Some", "None")),
  ],
  "national-politics": [
    facet("direction", "Direction of governance", "Is the country heading the right way on this?", opts("Right direction", "Too early to say", "Wrong direction")),
    facet("economy", "Economic handling", "How is the economic side being managed?", opts("Competent", "Mixed", "Mishandled")),
    facet("transparency", "Transparency", "Is enough being disclosed?", opts("Open", "Partial", "Opaque")),
    facet("tone", "Public discourse", "How is this being talked about?", opts("Constructive", "Noisy", "Toxic")),
  ],
  policy: [
    facet("intent", "Intent", "Is the underlying goal sound?", opts("Sound", "Mixed", "Misguided")),
    facet("implementation", "Implementation", "Is it being rolled out well?", opts("Well executed", "Uneven", "Botched")),
    facet("beneficiaries", "Who benefits", "Who does this actually help?", opts("Most people", "A narrow group", "Almost nobody")),
    facet("clarity", "Communication", "Was it explained clearly?", opts("Clear", "Confusing", "Not explained")),
    facet("timing", "Timing", "Is now the right moment for this?", opts("Right time", "Debatable", "Wrong time")),
  ],
  politician: [
    facet("integrity", "Integrity", "Do you trust how they conduct themselves?", opts("Trust them", "Unsure", "Do not trust them")),
    facet("delivery", "Delivery on promises", "Have they done what they said?", opts("Largely", "Partly", "Barely")),
    facet("communication", "Communication", "How do they explain their decisions?", opts("Clear", "Guarded", "Evasive")),
    facet("accessibility", "Accessibility", "Are they reachable to people in their constituency?", opts("Present", "Occasionally", "Absent")),
  ],
  college: [
    facet("teaching", "Teaching quality", "How is the actual teaching?", opts("Strong", "Uneven", "Weak")),
    facet("placements", "Placements", "Do outcomes match the reputation?", opts("Match it", "Below reputation", "Far below")),
    facet("facilities", "Campus & hostel", "How is day-to-day life on campus?", opts("Good", "Adequate", "Poor")),
    facet("fees", "Fees vs value", "Is the fee justified?", opts("Justified", "Steep", "Unjustifiable")),
    facet("culture", "Student life", "How is the culture and support?", opts("Supportive", "Mixed", "Draining")),
  ],
  exam: [
    facet("difficulty", "Difficulty & fairness", "Was the paper fair?", opts("Fair", "Uneven", "Unfair")),
    facet("conduct", "Conduct & integrity", "Was it run cleanly?", opts("Clean", "Some concerns", "Compromised")),
    facet("results", "Results & timeliness", "Were results handled properly?", opts("On time", "Delayed", "Badly mishandled")),
    facet("syllabus", "Syllabus alignment", "Did it match what was prescribed?", opts("Matched", "Partly", "Out of syllabus")),
    facet("grievance", "Grievance handling", "Were objections dealt with?", opts("Addressed", "Slow", "Ignored")),
  ],
  career: [
    facet("roi", "Return on investment", "Was it worth the money and years?", opts("Worth it", "Marginal", "Not worth it")),
    facet("demand", "Job market demand", "Is there real demand right now?", opts("Strong", "Softening", "Weak")),
    facet("quality", "Course quality", "Did the programme teach you anything useful?", opts("Genuinely useful", "Some of it", "Little of it")),
    facet("worklife", "Work-life outcome", "How is life on the other side?", opts("Sustainable", "Demanding", "Punishing")),
    facet("advice", "Would you recommend it", "Would you tell someone to take this path today?", opts("Yes", "With caveats", "No")),
  ],
  food: [
    facet("taste", "Taste", "How was the food itself?", opts("Excellent", "Fine", "Poor")),
    facet("value", "Value for money", "Was it worth what you paid?", opts("Worth it", "Steep", "Overpriced")),
    facet("consistency", "Consistency", "Is it the same every visit?", opts("Reliable", "Variable", "Unpredictable")),
    facet("hygiene", "Hygiene", "How did the place look and feel?", opts("Clean", "Passable", "Concerning")),
    facet("return", "Would you go back", "Are you returning?", opts("Yes", "Maybe", "No")),
  ],
  /**
   * Somewhere you travelled to. The dimensions are the ones a review site
   * usually buries: whether the crowd ruins it, what it actually costs once
   * you are inside, and whether the place is being looked after.
   */
  place: [
    facet("experience", "The visit itself", "Was it worth going?", opts("Worth the trip", "Fine, not special", "Not worth it")),
    facet("value", "Value for money", "Was it worth what it cost you?", opts("Fair", "Steep", "A rip-off")),
    facet("crowding", "Crowds & queues", "How busy was it when you went?", opts("Comfortable", "Busy but bearable", "Ruined by crowds")),
    facet("upkeep", "Upkeep & cleanliness", "How well is the place looked after?", opts("Well kept", "Tired in places", "Neglected")),
    facet("access", "Getting there & around", "How easy was it to reach and navigate?", opts("Easy", "Some hassle", "A struggle")),
    facet("return", "Would you go back", "Would you return, or send a friend?", opts("Yes", "Once was enough", "No")),
  ],
  controversy: [
    facet("credibility", "Credibility of the claims", "How believable is the allegation so far?", opts("Credible", "Unproven", "Overblown")),
    facet("response", "Institutional response", "How have those responsible reacted?", opts("Adequate", "Slow", "Evasive")),
    facet("media", "Media handling", "Has the coverage been proportionate?", opts("Proportionate", "Uneven", "Sensationalised")),
    facet("accountability", "Accountability so far", "Has anyone actually been held to account?", opts("Yes", "Partially", "No")),
  ],
  /**
   * Deliberately generic, for the catch-all category. A subject that fits
   * nothing else has no obvious dimensions, so these ask the few things that
   * apply to almost anything — and the composer nudges the author to replace
   * them with questions of their own.
   */
  general: [
    facet("quality", "Overall quality", "How good is it?", opts("Good", "Mixed", "Poor")),
    facet("value", "Worth it", "Is it worth the time, money or attention?", opts("Worth it", "Borderline", "Not worth it")),
    facet("trust", "Trust", "Would you rely on it?", opts("Yes", "Unsure", "No")),
    facet("recommend", "Would you recommend it", "Would you tell someone else about it?", opts("Yes", "With caveats", "No")),
  ],
};

/**
 * Category fallback, used only when a topic has no aspects of its own and
 * names no set — for example a topic a participant created without writing
 * custom questions.
 */
export const DEFAULT_FACET_SET: Record<CategoryId, FacetSetId> = {
  entertainment: "film",
  brands: "brand",
  sports: "sports",
  technology: "gadget",
  events: "event",
  "national-politics": "national-politics",
  policies: "policy",
  politicians: "politician",
  colleges: "college",
  exams: "exam",
  careers: "career",
  food: "food",
  places: "place",
  other: "general",
  controversies: "controversy",
};
