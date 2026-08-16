# OpinionHQ Product Brief

## 1. Document Purpose

This document defines the initial product vision, scope, user experience, functional requirements, data model, and development priorities for OpinionHQ.

It is intended to serve as the primary product reference for design, engineering, testing, and future product discussions. Any implementation decision for the first version of OpinionHQ should remain consistent with this brief unless the document is deliberately updated.

The purpose of the first product release is not to build a complete public-opinion intelligence platform. The immediate objective is to validate the core product loop:

**A user discovers an entity, understands the public opinion around it, and contributes their own opinion.**

---

## 2. Product Name

**OpinionHQ**

OpinionHQ is the working and current product name.

The name represents the platform’s ambition to become a central destination for structured public opinion, sentiment data, discussion, and opinion-driven intelligence.

---

## 3. Product Vision

OpinionHQ is an entity-centric public-opinion platform that helps people understand what others think about events, people, organizations, products, policies, institutions, ideas, and other subjects of public interest.

Existing social platforms are effective at generating conversations, but they are not designed to represent public opinion in a structured, measurable, and historical form. Opinions are usually scattered across posts, comments, videos, and discussion threads. A user attempting to understand collective sentiment must manually interpret thousands of disconnected statements.

OpinionHQ converts these individual contributions into structured opinion data.

The platform combines voting, written opinions, discussions, verified status information, timelines, and visual analytics to answer a broader question:

> What do OpinionHQ participants think about this entity, and how has that opinion changed?

The long-term vision is to build a continuously evolving opinion graph that captures how people perceive important entities, how sentiment changes over time, which groups hold different views, and which developments influence public opinion.

---

## 4. Product Positioning

OpinionHQ should not be positioned as another social network, polling website, discussion forum, or review platform.

Its primary category is:

**Opinion Intelligence Platform**

The platform may contain social and discussion features, but these features exist to generate, contextualize, and enrich opinion data.

The core distinction is:

* Social platforms show what individual people are saying.
* Polling platforms capture answers to temporary questions.
* Review platforms focus primarily on products, services, or locations.
* OpinionHQ creates persistent, evolving profiles of public opinion around a wide variety of entities.

The written discussion is not the final product. The structured representation of opinion is the product.

---

## 5. Core Product Principles

### 5.1 Entity-First Structure

Everything on OpinionHQ revolves around an entity.

Users should not primarily create disconnected posts. Instead, opinions, discussions, status updates, analytics, and timelines should be organized around persistent entity pages.

### 5.2 Browsing Before Authentication

Visitors should be able to browse the landing page, open entities, view dashboards, read opinions, and understand the platform before creating an account.

Authentication should be required only when a user attempts to participate through actions such as voting, posting an opinion, replying, following an entity, or requesting a new entity.

### 5.3 Analytics Before Discussion

The entity dashboard must visually prioritize opinion analytics, key metrics, current status, and trends.

OpinionHQ should not resemble a conventional discussion forum with charts added as a secondary feature. The analytical representation of opinion should remain the dominant experience.

### 5.4 Facts and Opinions Must Remain Separate

Verified or sourced information must be clearly distinguished from user-generated opinion.

The platform must not visually present community sentiment, allegations, or unverified claims as established fact.

### 5.5 Transparent Sample Representation

Opinion results must be described as the views of participating OpinionHQ users unless representative sampling has been independently established.

A result should be presented as:

> 68% of 1,420 OpinionHQ participants oppose the proposal.

It should not be presented as:

> 68% of the public opposes the proposal.

### 5.6 Low-Friction Participation

The simplest opinion action should require minimal effort.

Users should be able to cast a vote in a few seconds. Written explanation should be encouraged but optional.

### 5.7 Controlled Early-Stage Quality

During the MVP stage, entities should be created and managed through an administrative workflow.

Open public entity creation should not be included in the initial release because it may produce duplicates, poor-quality pages, misinformation, abuse, and large numbers of inactive entities.

---

## 6. Definition of an Entity

An entity is the central object within the OpinionHQ product.

An entity represents any subject on which people can form, express, compare, and analyze opinions.

Examples include:

* A public event
* A person
* A company
* A product
* A government policy
* A competitive examination
* An educational institution
* A movie
* A sports team
* A technology
* A social issue
* A city
* A service
* A public decision
* An idea or proposal

The word “entity” is intentionally broader than “event.” A paper leak is an event, but a company, university, public figure, or technology is not. A general entity model allows the platform to support all of these subjects consistently.

---

## 7. Entity Categories

The first architecture should support flexible categorization, even if the MVP launches with only a small number of categories.

### 7.1 Events

Events are time-bound developments that usually have a beginning, ongoing updates, and a final or current status.

Examples include paper leaks, elections, sports matches, public protests, product launches, accidents, conferences, court rulings, and policy announcements.

Event entities are likely to rely heavily on timelines and status tracking.

### 7.2 People

People include politicians, business leaders, athletes, creators, public officials, executives, and other individuals whose public perception changes over time.

Relevant metrics may include popularity, approval, trust, controversy, and sentiment trends.

### 7.3 Organizations

Organizations include companies, government bodies, universities, non-profit organizations, sports clubs, and institutions.

Opinions may relate to reputation, leadership, performance, reliability, culture, service quality, or public trust.

### 7.4 Products and Services

These entities include consumer products, software platforms, digital services, vehicles, applications, subscription services, and public services.

Opinion dimensions may include quality, usability, pricing, reliability, design, support, and value.

### 7.5 Policies and Decisions

These include government policies, regulations, organizational decisions, institutional rules, proposed laws, public schemes, and administrative changes.

These entities may require approval metrics, affected-group analysis, timelines, and implementation status.

### 7.6 Educational Entities

These include colleges, universities, entrance examinations, recruitment examinations, placement processes, admission systems, and education-related controversies.

Education may be a strong initial launch category because users frequently seek opinions before making high-impact decisions.

### 7.7 Entertainment and Sports

These include movies, television series, public performances, tournaments, teams, athletes, transfers, and sporting events.

These categories may generate high participation but should not distract the MVP from validating the fundamental entity model.

### 7.8 Ideas and Social Issues

These include remote work, artificial intelligence, unemployment, climate change, urban development, public transport, nuclear energy, and other subjects of social debate.

These entities may remain active for long periods and may have high polarization.

---

## 8. Opinion Model

An opinion represents an individual user’s view of an entity.

For the MVP, an opinion should consist of two possible components:

1. A structured vote
2. An optional written statement

A user may submit only a vote, or a vote combined with a written explanation.

### 8.1 Vote Options

The initial vote scale should remain simple:

* Positive
* Neutral
* Negative

This scale is easy to understand, easy to visualize, and suitable across many entity categories.

Future versions may support entity-specific questions, approval scales, ratings, confidence levels, multi-dimensional voting, or custom response options.

### 8.2 Written Opinion

The written component allows the user to explain their vote.

The MVP should support concise opinion text rather than long-form publishing. The exact character limit can be determined during implementation, but the interface should encourage clarity and brevity.

### 8.3 Opinion Updates

A user should have only one active overall vote per entity.

Users should be allowed to update their vote or written opinion later. When the opinion changes, the system should preserve enough historical information to support future trend analysis and auditability.

### 8.4 Opinion Metadata

Each opinion should store:

* Opinion identifier
* Entity identifier
* User identifier
* Vote value
* Written text, if provided
* Creation timestamp
* Last updated timestamp
* Visibility or moderation state
* Engagement count
* Reporting status

Future versions may also include topic tags, supporting sources, confidence level, demographic visibility permissions, and AI-generated classification.

---

## 9. Discussions

Discussion is a supporting feature that provides reasoning and context around opinions.

The MVP may treat written opinions as the primary discussion objects and allow users to reply to them. A separate forum-like discussion system should be avoided unless necessary.

The purpose of discussion is to help users understand why sentiment exists, not to become the dominant product experience.

The initial discussion system should support:

* Viewing written opinions
* Sorting by recent, popular, positive, neutral, or negative
* Replying to an opinion
* Reacting to or upvoting useful contributions
* Reporting inappropriate content

Deep nested threads, direct messaging, real-time chat, complex community moderation, and subreddit-style groups are outside the first release.

---

## 10. Entity Status

Entity status represents the current real-world state of an entity.

This is particularly important for event-based entities.

For example, a paper-leak entity may move through stages such as:

**Reported → Under Verification → Confirmed → Investigation Ongoing → Arrests Made → Re-examination Announced → Case Closed**

The status system should be flexible because different entity types require different state models.

Examples include:

* Product: Rumored, Announced, Released, Discontinued
* Policy: Proposed, Approved, Implemented, Suspended, Repealed
* Legal case: Complaint Filed, Investigation Ongoing, Charges Filed, Trial Ongoing, Verdict Issued
* Event: Upcoming, Live, Completed, Cancelled
* Organization: Active, Acquired, Merged, Inactive
* Examination issue: Alleged, Confirmed, Under Investigation, Resolved

For the MVP, status values can be entered manually by an administrator.

The entity page should display:

* Current status
* Last updated timestamp
* Short status explanation
* Source or reference, where applicable

---

## 11. Entity Timeline

The timeline provides a chronological record of important developments related to an entity.

Each timeline item should contain:

* Date and time
* Short title
* Description
* Source or reference
* Verification state
* Optional relationship to a status change

The timeline is valuable because it enables users to compare real-world developments with changes in public opinion.

For example, a sentiment chart may show that negative opinion increased immediately after a new investigation report, product issue, policy announcement, or public statement.

In the MVP, timeline entries should be created and maintained by administrators.

---

## 12. Landing Page

The landing page is the primary discovery surface for OpinionHQ.

It should communicate that the platform is active, current, visual, and centered on public opinion.

The page should be clean, modern, and responsive.

### 12.1 Header

The top navigation should include:

* OpinionHQ logo
* Search
* Category navigation
* Login
* Create account
* User menu when authenticated

The header should remain visually simple and should not compete with the content.

### 12.2 Viral Entity Strip

A horizontally scrolling section near the top of the landing page should display viral or rapidly growing entities.

The strip may auto-scroll, but users must also be able to control it manually. Auto-scrolling should pause during interaction and should not harm accessibility.

Each item should show concise information such as:

* Entity name
* Category
* Current sentiment
* Activity indicator
* Trend direction

The viral section should communicate the live pulse of the platform.

### 12.3 Scrollable Entity Sections

The main page should contain curated sections such as:

* Trending now
* Most discussed
* Most polarizing
* Recently updated
* Popular in a selected category
* Opinion of the day

The initial MVP should use a small number of meaningful sections rather than a large, cluttered feed.

### 12.4 Entity Cards

Each entity card should help the user decide whether to open the page.

A card may contain:

* Entity name
* Entity image or icon
* Category
* Short description
* Current sentiment
* Number of participants
* Current status
* Recent activity
* Trend direction

The card should not attempt to display the entire dashboard.

### 12.5 Anonymous Browsing

Visitors should be able to access the landing page and entity dashboards without authentication.

This allows them to understand the value of OpinionHQ before registering.

### 12.6 Inside a Result

The landing page carries a working copy of the analytics layer, so a visitor can
see what a subject page produces before creating an account: the distribution,
the trend with verified events plotted on it, the cross-tabs by region, age and
occupation, the aspect questions, and the written contributions with their
replies. One switch moves the whole panel between the two public modes, and
clicking any breakdown row re-reads every chart as that group.

Implemented in `src/components/landing/ResultShowcase.tsx` and
`src/components/landing/showcase/`.

**It runs on a worked example, and that is a rule rather than a convenience.**
No figure in the section is a measurement, so:

* The subject is generic and implicates no real institution, exam, film, brand
  or person, and regions are compass directions rather than named states.
* No headcount appears anywhere — shares only. Days are numbered, not dated.
* Contributions are attributed to "Participant" and a position. Never a name,
  an avatar or a like count.
* The panel carries an "Illustration" badge in its chrome, above the first
  chart, in the position a live page uses for its status.

Every number comes from one model (`showcase/data.ts`) rather than from
hand-written percentages, which is what lets the panels stay consistent under
filtering. The invariants that model has to hold are tested in
`showcase/data.test.ts`.

§30 requires every live analytic to be aggregated server-side from stored
votes. This section is the other half of that rule: where a figure is *not*
aggregated from votes, it must be unmistakable that it is not.

---

## 13. Search and Discovery

Search is important because the long-term platform may contain a large number of entities.

The MVP should support search by:

* Entity name
* Alternate name
* Category
* Tag
* Short description

Search results should prioritize exact matches, popular entities, and recently active entities.

The product should also support basic category filtering.

Advanced semantic search, personalized recommendations, location-based recommendations, and AI-assisted discovery are not required for the first version.

---

## 14. Entity Dashboard

The entity dashboard is the core product page.

When a user opens an entity, they should immediately understand:

* What the entity is
* What its current status is
* How OpinionHQ participants feel about it
* How sentiment has changed
* What users are saying
* What major developments have occurred

### 14.1 Entity Header

The page header should include:

* Entity name
* Entity category
* Short description
* Image, logo, or cover visual
* Current status
* Status explanation
* Participant count
* Last updated timestamp
* Follow or watch action
* Share action

### 14.2 Page Navigation

The dashboard should use a small number of clear tabs or sections.

Recommended initial structure:

* Overview
* Opinions
* Discussion
* Timeline

The exact interface may use tabs, anchor navigation, or responsive stacked sections.

### 14.3 Overview

The Overview section should present the most important information first.

It should contain:

* Overall sentiment distribution
* Total participant count
* Sentiment trend over time
* Current status
* Recent timeline events
* Summary of major written opinions

The first release should prefer three or four high-value visualizations over a large number of low-value charts.

### 14.4 Opinion Submission

The entity dashboard should contain a clear call to action:

> Share your opinion

The user selects Positive, Neutral, or Negative and may optionally add a written explanation.

Unauthenticated users who attempt to submit should be shown a login or registration flow. Their selected vote and written draft should be preserved during authentication.

### 14.5 Opinions View

The Opinions section should show written opinions and allow filtering by sentiment.

Each opinion card should display:

* User identity or display name
* Vote
* Opinion text
* Timestamp
* Engagement
* Reply count
* Report action

Anonymous public posting is not recommended for the MVP. Users may use a display name, but each opinion should remain connected to an authenticated account internally.

### 14.6 Timeline View

The Timeline section should display verified developments in chronological order.

It should visually distinguish administrator-published factual updates from community-generated opinions.

---

## 15. Analytics and Visualizations

Rich data representation is one of OpinionHQ’s primary differentiators.

However, the MVP should implement only the analytics that can be calculated reliably with early-stage data.

### 15.1 Sentiment Distribution

This visualization shows the percentage and count of positive, neutral, and negative votes.

It must always display the total sample size.

### 15.2 Sentiment Trend

This chart shows how sentiment changes over time.

The aggregation interval may vary depending on activity. Early entities may use daily or weekly aggregation.

The chart should be designed so that timeline events can later be overlaid as markers.

### 15.3 Participation Trend

This metric shows how many users are contributing over time.

It helps distinguish a genuine sentiment shift from a sudden increase or decrease caused by changes in participation volume.

### 15.4 Demographic Distribution

Demographic analytics are strategically important but should be treated carefully.

The MVP should include demographic charts only if the platform collects enough voluntary information and the sample size is large enough to avoid misleading or privacy-sensitive results.

Potential future dimensions include:

* Age group
* Gender
* Education
* Occupation
* Industry
* Student or working-professional status

Users should control whether optional demographic information contributes to aggregate analytics.

### 15.5 Geographic Distribution

Geographic opinion maps are part of the long-term product vision but are not essential for the first public MVP.

Location data should be collected only with clear user consent and appropriate privacy controls.

A later version may support country, state, region, city, or district-level analysis when sample sizes are sufficient.

### 15.6 Polarization

Polarization measures the extent to which opinion is divided.

A topic where most users select Neutral is different from a topic where half select Positive and half select Negative, even if both have a similar average score.

This metric is valuable but can be introduced after the core sentiment model is validated.

### 15.7 Confidence and Sample Quality

Future dashboards should communicate how reliable a result is based on participation volume, recency, demographic concentration, bot detection, and other quality indicators.

The MVP should begin with transparent participant counts and avoid presenting a complex confidence score before the methodology is defensible.

---

## 16. User Accounts and Authentication

The MVP should support account creation and login.

Recommended authentication methods include:

* Email and password
* Google sign-in

Additional providers can be added later.

A user profile should initially contain:

* User identifier
* Display name
* Email
* Profile image
* Account creation date
* Role
* Optional demographic fields
* Followed entities
* Opinion history

Users should be able to edit or delete their opinions.

Account deletion and privacy controls should be considered from the beginning, even if the first interface is basic.

---

## 17. User Roles

The initial system should support at least three roles.

### 17.1 Visitor

A visitor can browse landing pages, entities, charts, timelines, and public opinions.

A visitor cannot vote, post, reply, follow, report, or request an entity without authentication.

### 17.2 Registered User

A registered user can:

* Vote
* Write opinions
* Update their opinion
* Reply
* React
* Follow entities
* Report content
* Request new entities

### 17.3 Administrator or Moderator

An administrator can:

* Create entities
* Edit entity metadata
* Update entity status
* Add timeline events
* Manage categories
* Moderate opinions and replies
* Review reports
* Hide or remove content
* Review entity requests
* Feature entities on the landing page

Future versions may separate administrator, editor, fact-checker, and community moderator roles.

---

## 18. Admin System

An internal administrative interface is required for the MVP.

The first admin system does not need the same visual polish as the public platform, but it must support reliable product operation.

The admin interface should allow authorized users to:

* Create an entity
* Edit entity details
* Upload or assign an entity image
* Set categories and tags
* Publish or unpublish entities
* Update status
* Add timeline entries
* Feature entities
* Review user reports
* Moderate opinions and replies
* Review requested entities

Direct production database editing should not be the normal operating process.

---

## 19. Moderation and Trust

OpinionHQ will contain user-generated content and must include basic moderation from the first version.

The platform should support:

* Content reporting
* Administrative review
* Content hiding
* Content deletion
* User suspension
* Basic profanity or abuse filtering
* Rate limiting
* Duplicate-submission prevention
* Spam detection

OpinionHQ should establish clear rules against harassment, threats, hate speech, doxxing, impersonation, fabricated evidence, and unlawful content.

The platform must be especially careful with entities involving allegations, criminal investigations, individuals, and politically sensitive issues.

User opinions must be presented as user-generated views, not verified claims.

---

## 20. Cold-Start Strategy

OpinionHQ should not launch with hundreds of empty entities.

The initial release should focus on a narrow category and a small number of high-quality, active pages.

A practical launch may begin with approximately 20 to 50 curated entities.

Each launch entity should contain:

* A clear description
* Current status
* Relevant timeline
* Source references
* Real pilot votes
* Real written opinions where available

The platform should recruit a small founding community before public launch.

The first users may come from focused communities such as students, professionals, college groups, exam communities, technology communities, or local-interest groups.

OpinionHQ should concentrate participation through mechanisms such as:

* Opinion of the day
* Featured entities
* Trending entities
* Recently updated entities
* Shareable result cards
* Community partnerships
* Private beta groups

The platform must not fabricate users, votes, comments, or engagement.

Demo data may be used during development, but it must be clearly marked and removed or separated before public launch.

---

## 21. Initial Launch Vertical

The long-term product may support opinions on almost anything, but the MVP should launch with a focused domain.

A suitable initial vertical could be:

**Education, competitive exams, colleges, placements, early-career decisions, and student-related public issues.**

Possible entities include:

* CAT
* GATE
* JEE
* NEET
* Major examination policy changes
* Examination controversies
* IITs
* IIMs
* NITs
* Placement outcomes
* Recruitment processes
* Education policies
* Public-sector recruitment issues

This category has several advantages:

* Users actively seek peer opinion
* Decisions are high impact
* Topics change frequently
* Communities already exist
* The founder understands the audience
* Both permanent and event-based entities are available

This launch category is a recommendation, not a permanent restriction.

---

## 22. MVP Scope

The first functional MVP should include:

* Responsive web application
* Public landing page
* Viral or trending entity strip
* Entity sections and cards
* Search
* Category filtering
* Public entity dashboard
* Entity description
* Entity status
* Entity timeline
* Positive, neutral, and negative voting
* Optional written opinion
* Opinion listing
* Basic replies
* Authentication
* Sentiment distribution
* Sentiment trend
* Participation count
* Admin-controlled entity creation
* Admin-controlled timeline and status updates
* Reporting and basic moderation
* Deployment
* Product analytics
* Error monitoring

---

## 23. Features Excluded From the MVP

The following features should not be implemented in the first release unless they become necessary for validation:

* Native Android application
* Native iOS application
* Real-time chat
* Direct messaging
* Open public entity creation
* Advanced recommendation engine
* AI-generated opinion summaries
* Automated fact extraction
* Automated status updates
* Complex entity knowledge graph
* Full demographic segmentation
* Detailed geographic heat maps
* Political-affiliation analytics
* Enterprise analytics dashboards
* Paid subscriptions
* Sponsored surveys
* Public API
* Complex confidence scoring
* Advanced bot-detection system
* Multi-language support
* Live video or audio content
* Long-form publishing
* Community groups
* Gamification or reputation systems

These features may be considered after the central user journey has been validated.

---

## 24. Core User Journey

### 24.1 Discovery

A visitor arrives on the landing page and sees trending, viral, recently updated, or category-based entities.

The visitor understands that OpinionHQ provides structured public-opinion dashboards.

### 24.2 Entity Exploration

The visitor opens an entity page.

They view:

* Entity description
* Current status
* Sentiment distribution
* Participant count
* Sentiment trend
* Written opinions
* Timeline updates

### 24.3 Participation Intent

The visitor selects Positive, Neutral, or Negative and optionally writes an explanation.

### 24.4 Authentication

If the visitor is not signed in, the platform asks them to log in or create an account.

The user’s selected vote and written draft must not be lost during this process.

### 24.5 Submission

The user submits their opinion.

The entity dashboard updates to reflect the new participation.

### 24.6 Continued Engagement

The user may:

* Read other opinions
* Reply
* Follow the entity
* Share the result
* Explore related entities
* Return when the entity status changes

---

## 25. Primary Product Hypotheses

The MVP is intended to test the following hypotheses:

### 25.1 Comprehension Hypothesis

Users understand the concept of an entity-based opinion platform without extensive explanation.

### 25.2 Discovery Hypothesis

Users are willing to browse entities from a landing page and open dashboard pages.

### 25.3 Analytics Hypothesis

Users find structured sentiment data more useful than reading unstructured comments alone.

### 25.4 Participation Hypothesis

Users are willing to submit a simple vote when the interaction requires minimal effort.

### 25.5 Expression Hypothesis

A meaningful percentage of voters will add a written explanation.

### 25.6 Return-Value Hypothesis

Users return when an entity receives new developments, status changes, or sentiment shifts.

### 25.7 Sharing Hypothesis

Users are willing to share clear result cards or dashboard links outside OpinionHQ.

---

## 26. MVP Success Metrics

The MVP should prioritize engagement quality rather than total registered users.

Important early metrics include:

* Landing-page-to-entity click-through rate
* Percentage of entity visitors who vote
* Percentage of voters who add written text
* Registration conversion after participation intent
* Opinions per active entity
* Seven-day returning-user rate
* Number of followed entities
* Number of shared result links
* Number of entities receiving daily activity
* Ratio of active entities to inactive entities
* Number of reports per 1,000 contributions
* Percentage of users who update an opinion after a status change

A small number of active entities is more valuable than a large catalogue of empty pages.

---

## 27. Non-Functional Requirements

### 27.1 Responsive Design

The product must work well across desktop, tablet, and mobile browsers.

The first version should be built as a responsive web application.

### 27.2 Performance

Landing pages and entity pages should load quickly.

Charts should not block the initial page render.

Images should be optimized and lazy-loaded where appropriate.

### 27.3 Accessibility

The product should support keyboard navigation, semantic HTML, readable contrast, chart labels, reduced-motion preferences, and screen-reader-friendly interactions.

Auto-scrolling content must be controllable.

### 27.4 Security

The system should include secure authentication, password protection, server-side authorization, input validation, rate limiting, protection against common web vulnerabilities, and secure handling of administrative actions.

### 27.5 Privacy

Only necessary personal data should be collected.

Optional demographic and geographic information should require clear consent.

Public analytics should use aggregate data and minimum sample thresholds where necessary.

### 27.6 Scalability

The MVP does not need internet-scale infrastructure, but the architecture should avoid decisions that make core entities, opinions, and analytics difficult to scale later.

### 27.7 Observability

The deployed product should include:

* Error monitoring
* Basic application logs
* Performance monitoring
* Product-event analytics
* Uptime monitoring

---

## 28. Suggested Data Model

The exact implementation may evolve, but the initial domain model should include the following primary objects.

### User

Represents an authenticated participant.

### Entity

Represents the central subject of opinion.

### Category

Defines the primary classification of an entity.

### Tag

Supports flexible discovery and secondary classification.

### Opinion

Stores a user’s structured vote and optional written opinion.

### OpinionRevision

Preserves changes to a user’s opinion over time.

### Reply

Stores responses to written opinions.

### Reaction

Stores user engagement with an opinion or reply.

### EntityStatus

Stores the current status and status metadata.

### TimelineEvent

Stores verified chronological developments.

### EntityFollow

Connects a user to an entity they want to monitor.

### EntityRequest

Allows users to suggest new entities.

### Report

Stores moderation reports against user-generated content.

### SourceReference

Stores supporting references for status updates, timeline events, and factual entity information.

### EntityRelationship

Supports future links between related entities.

### AnalyticsSnapshot

Stores precomputed or historical entity metrics where required.

---

## 29. Entity Data Requirements

Each entity should support the following information:

* Unique identifier
* Slug
* Name
* Alternate names
* Short description
* Full description
* Entity type
* Primary category
* Tags
* Image
* Cover image
* Publication state
* Verification state
* Current status
* Status explanation
* Creation timestamp
* Last updated timestamp
* Created by
* Featured state
* Trending score
* Related entities
* Source references

Not every field must be displayed in the MVP, but the model should support future expansion.

---

## 30. Analytics Calculation Requirements

The platform should not calculate analytics directly from unvalidated client input.

Vote submissions should be stored server-side and aggregated through trusted backend logic.

The initial analytics should calculate:

* Positive vote count
* Neutral vote count
* Negative vote count
* Total participant count
* Sentiment percentage
* Daily participation
* Daily vote distribution
* Basic trend direction

A user should count only once in the current overall distribution for an entity.

If the user updates their opinion, the current aggregate should reflect the latest vote while historical revisions may support future longitudinal analysis.

Deleted, hidden, spam, or moderated opinions should not contribute to public analytics.

---

## 31. Trending and Viral Logic

The landing page requires a method for identifying trending or viral entities.

The first version may use a simple weighted score based on:

* Recent votes
* Recent written opinions
* Recent replies
* Unique participants
* Rate of activity growth
* Status updates
* Shares or follows

The score should prioritize recent acceleration rather than only total historical volume.

The exact formula may remain configurable and should not be hard-coded throughout the application.

---

## 32. Shareable Results

OpinionHQ should make entity results easy to share.

A shareable representation should contain:

* Entity name
* Current sentiment result
* Participant count
* OpinionHQ branding
* Timestamp or last-updated information
* Link to the entity dashboard

The wording must clearly describe the sample.

Example:

> 61% of 842 OpinionHQ participants currently hold a negative opinion of this decision.

Shareable result cards can later become an important acquisition channel.

---

## 33. Design Direction

OpinionHQ should use a modern, clean, data-oriented visual language.

The interface should feel credible, current, and analytical without appearing institutional or excessively corporate.

The design should prioritize:

* Strong typography
* Clear information hierarchy
* Generous spacing
* High-quality charts
* Restrained use of color
* Consistent entity cards
* Clear sentiment states
* Accessible interactions
* Responsive layouts

Sentiment colors should be used consistently, but color must not be the only indicator because of accessibility requirements.

The dashboard should feel closer to a modern analytics product than a traditional forum.

---

## 34. Suggested Technical Direction

The final technology choices may be decided after repository inspection, but the product is well suited to a modern TypeScript-based web stack.

A possible implementation may include:

* Next.js
* React
* TypeScript
* PostgreSQL
* Prisma or another type-safe ORM
* Tailwind CSS
* Recharts, Apache ECharts, or another charting library
* Auth.js, Clerk, Supabase Auth, or equivalent authentication
* Object storage for images
* A managed deployment platform
* Product analytics and error monitoring

Technology selection should prioritize development speed, maintainability, security, and the solo-development context.

The architecture should avoid unnecessary microservices during the MVP.

---

## 35. Development Priorities

The recommended implementation order is:

### Phase 1: Foundation

Set up the application, database, authentication, design system, deployment, and administrator role.

### Phase 2: Entity System

Implement entity creation, editing, categories, tags, status, timeline, public pages, and entity cards.

### Phase 3: Opinion System

Implement voting, written opinions, opinion updates, replies, reactions, and reporting.

### Phase 4: Analytics

Implement sentiment distribution, participant counts, trend charts, and activity aggregation.

### Phase 5: Discovery

Implement landing-page sections, viral entities, trending logic, search, and category filtering.

### Phase 6: Admin and Moderation

Complete entity management, content moderation, entity requests, reports, and publishing workflows.

### Phase 7: Private Beta

Seed real entities, recruit pilot users, collect feedback, monitor metrics, and improve the core journey.

---

## 36. Product Risks

### 36.1 Empty-Platform Risk

The platform may appear inactive if too many entities are launched without sufficient participation.

The response is to launch narrowly and concentrate activity.

### 36.2 Misrepresentation Risk

Users may interpret platform sentiment as representative of the wider population.

The response is to display sample sizes and clearly refer to OpinionHQ participants.

### 36.3 Misinformation Risk

Users may post allegations or present opinions as facts.

The response is to separate verified information from user-generated content and implement moderation.

### 36.4 Abuse and Polarization Risk

Controversial topics may attract harassment, brigading, coordinated manipulation, or toxic discussion.

The response is to implement reporting, rate limiting, moderation, and transparent analytics.

### 36.5 Bot and Manipulation Risk

Votes may be artificially inflated through fake accounts or coordinated campaigns.

The MVP should include basic controls, while advanced trust scoring can be added later.

### 36.6 Overbuilding Risk

The product may become delayed by attempting to build AI summaries, maps, recommendation systems, and enterprise features before validating the core loop.

The response is to enforce the MVP exclusions defined in this document.

### 36.7 Category Dilution Risk

Launching across too many unrelated topics may scatter early participation.

The response is to begin with one focused vertical.

---

## 37. Open Product Decisions

The following decisions may be resolved during design and development:

* Whether users can vote without adding text
* Maximum opinion length
* Whether replies can be nested
* Whether reactions use a single “helpful” action or multiple reaction types
* Whether users can hide their public opinion history
* Minimum sample size required before displaying percentages
* Whether result details are visible before voting
* Exact entity status model
* Exact trending-score formula
* Whether demographic data is collected during onboarding or later
* Whether entity follows are included in the first private beta
* Whether entity requests are available immediately
* Whether the MVP launch vertical is education or another focused category

These decisions should be documented when finalized.

---

## 38. Long-Term Product Direction

If the MVP successfully validates entity discovery, structured participation, and dashboard value, OpinionHQ may expand into a broader opinion-intelligence platform.

Potential long-term capabilities include:

* Advanced demographic analytics
* Geographic heat maps
* AI-generated opinion summaries
* Topic extraction
* Sentiment explanations
* Polarization scoring
* Confidence scoring
* Opinion-change tracking
* Entity comparison
* Entity relationship graphs
* Historical opinion replay
* Media integrations
* Public APIs
* Research datasets
* Enterprise brand monitoring
* Government and public-sector dashboards
* Sponsored surveys with clear disclosure
* Premium analytics
* Multi-language support
* Native mobile applications

These are strategic possibilities rather than MVP commitments.

---

## 39. Long-Term Business Model

The initial release should focus on user value, engagement, data quality, and trust rather than immediate monetization.

Potential future revenue sources include enterprise analytics, brand monitoring, media partnerships, premium user subscriptions, research access, public APIs, clearly disclosed sponsored surveys, and custom opinion-intelligence reports.

The most valuable long-term asset is not the website itself. It is the accumulated opinion graph: a structured historical dataset showing how sentiment changes across entities, topics, groups, locations, and real-world developments.

This dataset becomes more valuable as participation, coverage, quality, and history increase.

---

## 40. Definition of MVP Completion

The first MVP may be considered complete when:

* A visitor can browse the landing page without authentication.
* A visitor can search for and open an entity.
* An entity page displays a description, current status, timeline, sentiment distribution, trend chart, and opinions.
* A visitor can begin submitting a vote and optional written opinion.
* Authentication is triggered contextually without losing the draft.
* An authenticated user can submit and update an opinion.
* Public analytics update correctly.
* Users can reply to and report opinions.
* Administrators can create and manage entities, status updates, timelines, and moderation actions.
* The application works on desktop and mobile browsers.
* The application is deployed with error monitoring and product analytics.
* The platform contains a focused set of authentic, curated launch entities.
* A private beta group can use the complete core journey without administrator intervention.

---

## 41. Product Summary

OpinionHQ is a structured public-opinion platform built around persistent entity dashboards.

The MVP should validate one central experience:

> Discover an entity, understand the current opinion around it, and contribute your own view.

The product should prioritize entity discovery, clear dashboards, low-friction voting, transparent sample representation, verified status tracking, and careful separation between facts and opinions.

The first version should remain narrow, reliable, and operationally manageable.

OpinionHQ should not attempt to model society at scale during the MVP stage. It should first prove that users value structured opinion data more than fragmented discussion and that they are willing to contribute to a persistent, evolving opinion profile.
