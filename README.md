Buyer-First Intel (BFI) – Full Project Context
Executive Summary

Buyer-First Intel (BFI) is a buyer-only real estate due diligence platform.

The platform exists to solve one problem:

Home buyers often rely on listing data, agent information, and marketing materials that may not fully reflect public records or physical reality.

BFI helps buyers independently verify properties before they become emotionally committed.

The platform is intentionally:

Buyer-first
MLS-independent
Anti-listing
Verification-focused
Trust-driven

BFI is not a marketplace, listing portal, brokerage tool, agent platform, or social network.

Core Product Philosophy

The platform should answer:

"Can I trust this property before I spend hundreds of thousands of dollars?"

The platform should NOT answer:

"Which house should I buy?"

or

"What is this property worth?"

Those are different products.

Product Positioning
Incorrect Positioning
Zillow competitor
MLS alternative
Property marketplace
Review site
Neighborhood app
Correct Positioning

A buyer due-diligence and verification platform.

Or:

A property audit system for home buyers.

Or:

A buyer-first verification protocol.

Problem Being Solved

Real-world example:

Listing claims:

2924 sqft

County records:

2509 sqft

Buyer discovers discrepancy late.

The platform should surface:

Public-record truth
Differences between public records and externally claimed values
Verified buyer observations

before the buyer:

visits
offers
negotiates
MLS Position

BFI has zero MLS dependency.

Never integrate:

MLS
IDX
VOW
Listing feeds
DOM
Price changes
Active/Pending status

Never build:

Listing search
Property marketplace
Agent lead generation

Rule:

If it helps market a house, do not build it.

If it helps a buyer decide, build it.

Target Users

Primary:

First-time home buyers
Repeat buyers
Relocating buyers

Secondary:

Serious diligence-focused buyers

Explicitly excluded:

Listing agents
Seller agents
Brokerages
MLS participants

Agents are NOT personas.

Current Technical Stack

Frontend:

React
Vite
Tailwind CSS

Backend:

Supabase
PostgreSQL
Row Level Security (RLS)
Edge Functions

Data:

ATTOM API

Location:

Google Location APIs

Authentication:

Google Login implemented
Future support:
Google
Facebook
Apple
Phone OTP

Hosting:

Bolt / Netlify
Features Already Built
Property Comparison Engine

Pulls:

County sqft
County bedrooms
County bathrooms
Year built

from ATTOM.

Compares against user-entered external values.

Displays:

Mismatch indicators
Percentage differences
Due Diligence Checklist

Property-specific checklist.

Categories:

Physical audit
Legal
HOA
Flood
Neighborhood

Stored as JSONB.

Persists between sessions.

Watchlist

Users can:

Save properties
Revisit audits
Continue diligence process
GPS Presence Confirmation

Current implementation:

Google location API
User taps button
GPS proximity verified

No dwell time.

No timers.

No gamification.

Community Insights

Current concept:

Verified users can contribute observations.

Need refinement.

Public observations should become structured and aggregated.

Authentication Philosophy

Current direction:

Users can sign up using:

Google
Facebook
Apple
Phone OTP

Like:

YouTube
Airbnb
Dating apps

Users remain logged in unless:

They explicitly log out
Security event occurs

Persistent sessions are required.

Verification Philosophy

Previous versions used:

GPS radius
Dwell time
Credit systems

These have been intentionally simplified.

Current direction:

Presence Confirmation

User:

Visits property
Opens app
Taps confirmation button

GPS verifies proximity.

No waiting.

No timer.

Why No Dwell Time?

Reasoning:

A home buyer already intends to spend:

hundreds of thousands of dollars

A $10 paid product creates sufficient seriousness.

Therefore:

Friction should be low
Compliance should be high

The trust model depends on:

Multiple independent buyers converging on similar observations

not perfect verification.

Community Insight Philosophy

This is critical.

The platform must NOT become:

Yelp for houses
Reddit for real estate
Nextdoor

Avoid:

ratings
scores
sentiment
upvotes
public opinions
Allowed

Structured observations only.

Examples:

Noise observed
Parking constraints
Basement present
Garage conversion
Ceiling height issue
Public Display Rules

Show only:

Aggregated counts.

Example:

3 buyers observed noise
4 buyers confirmed garage conversion

Never show:

Raw comments
Public free text
User identities
Photos

Current thinking:

Photos can be uploaded.

But:

Optional
Used for verification
Not primary product

Avoid:

Public photo galleries.

Buyer Workspace

This is a major product pillar.

Every property should have:

Public Record Audit

County truth.

Discrepancy Engine

County vs external claims.

Checklist

Due diligence workflow.

Notes

Private buyer notes.

Presence Confirmation

Optional verification.

Community Signals

Aggregated only.

Access Model

Current preferred approach:

Free Tier

First 5 property audits free.

An audit means:

Address lookup
Comparison
Checklist
Notes
Full property experience
Paid Tier

After 5 property audits:

~$10 subscription

Reasoning:

A serious buyer will happily pay $10 if they are spending hundreds of thousands on a property.

This creates:

Serious users
Reduced spam
Sustainable business model

No complicated credit economy at launch.

What We Learned From Neighborhood Check

Neighborhood Check exists.

It focuses on:

Crime
Schools
Demographics
Environmental risk

Neighborhood-level intelligence.

What BFI Does Differently

Neighborhood Check answers:

What is happening around this area?

BFI answers:

Can I trust this property?

BFI focuses on:

Property-level truth
County records
Verification
Due diligence workflow
UX Direction

Inspired by:

Asana onboarding
Calm professional tools
Bloomberg Terminal mindset
Audit systems

Not inspired by:

Zillow
Social feeds
Reddit
TikTok
Onboarding

Three-screen onboarding flow.

Screen 1:
Verify public-record truth.

Screen 2:
Confirm on-site observations.

Screen 3:
Keep your due diligence workflow organized.

Then:

Immediately show:

Paste Property Address

No dashboard first.

No feed.

No map.

Home Screen

Single dominant action:

Paste Property Address

This is the center of the product.

Everything starts there.

Product Workflow

Address
→ Public Record Audit
→ External Claim Entry
→ Discrepancy Detection
→ Checklist
→ Notes
→ Save Property
→ Presence Confirmation
→ Structured Observations
→ Aggregated Community Signals

Features Explicitly Deferred

Do NOT build now:

MLS integrations
Price analytics
DOM tracking
Market trends
Agent tools
Seller tools
Ratings
Sentiment
Reputation systems
Public comments
Public photo galleries
AI valuation models
Core Principle

Buyer-First Intel is not a marketplace.

Buyer-First Intel is a verification protocol for home buyers.

Every future product decision should be evaluated against that principle.

Immediate Goal

Restart the project cleanly.

Use AI tools (Gemini, Lovable, Bolt, Replit, ChatPRD, Claude, etc.) to:

Generate a final production-grade PRD
Build onboarding
Build login
Build home page
Build property audit workflow
Build buyer workspace
Build presence confirmation
Build structured community observations

Focus on end-to-end completion before launch.

The first successful user experience should be:

Paste an address → see county reality → identify discrepancies → save notes → make a better buying decision within 30 seconds.

That is the core vision of BFI.
