# Buyer-First Intel (BFI)

A mobile-first property audit platform for U.S. home buyers to research properties before making an offer.

## Overview

Buyer-First Intel is a buyer-only platform focused on property due diligence. It provides:
- Property fact sheets from public records
- Community-driven buyer insights (observations shared by other buyers)
- GPS visit verification
- Private watchlist with progress tracking (Researching → Visited → Audited → Decision)

**Key Constraint:** No MLS data, no prices, no agent/seller tools.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS with high-contrast mobile-first design
- **Backend:** Express.js
- **Database:** PostgreSQL with Drizzle ORM
- **Icons:** Lucide React

## Project Structure

```
client/src/
├── components/
│   ├── layout/         # MobileNav, Header, PageContainer
│   ├── property/       # AddressSearch, PropertyCard, PropertyFactSheet
│   ├── audit/          # ChecklistSection
│   └── gps/            # GPSVerification
├── hooks/
│   └── use-auth.ts     # Authentication hook for Replit Auth
├── pages/
│   ├── LandingPage.tsx # Dating app-style login page (unauthenticated)
│   ├── Home.tsx        # Dashboard (authenticated users)
│   ├── SearchPage.tsx  # Property search
│   ├── PropertyPage.tsx # Property details
│   ├── WatchlistPage.tsx # Saved properties
│   ├── AuditPage.tsx   # Due diligence checklist
│   └── VerifyPage.tsx  # GPS verification
└── lib/                # Query client utilities

server/
├── routes.ts           # API endpoints
├── storage.ts          # Database operations
├── db.ts               # Database connection
└── replit_integrations/
    └── auth/           # Replit Auth OIDC integration

shared/
├── schema.ts           # Data models (Drizzle schemas)
└── models/
    └── auth.ts         # User and session schemas
```

## Core Features

1. **Address Search** - Search for properties by address with normalization
2. **Property Fact Sheet** - View public records (sqft, bed/bath, year built)
3. **Community Insights** - Share observations visible to other buyers for negotiation leverage
4. **GPS Verification** - Confirm presence within 100m of property
5. **Watchlist** - Save and track properties of interest

## API Endpoints

- `GET /api/properties` - List all properties
- `GET /api/properties/:id` - Get property by ID
- `GET /api/properties/search/:query` - Search properties
- `POST /api/properties` - Create new property
- `GET /api/watchlist` - Get saved properties
- `GET /api/watchlist/ids` - Get watchlist property IDs
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:propertyId` - Remove from watchlist
- `GET /api/checklist/:propertyId` - Get checklist for property
- `PATCH /api/checklist/:id` - Update checklist item
- `GET /api/visits/:propertyId` - Get visit history
- `GET /api/visits/:propertyId/count` - Get count of verified visits
- `POST /api/visits` - Record visit verification
- `GET /api/places/autocomplete?input=<query>` - Google Places address autocomplete
- `GET /api/places/details/:placeId` - Get full address details from Google Places
- `GET /api/attom/property?address1=<street>&address2=<city,state>` - Get property details from ATTOM
- `GET /api/flags/:propertyId` - Get community flags for a property
- `POST /api/flags/:propertyId` - Submit a new flag
- `GET /api/flags/:propertyId/count` - Get flag count for a property
- `POST /api/flags/:flagId/helpful` - Mark a flag as helpful

## Database Schema

- **properties** - Property records with comprehensive ATTOM data:
  - Basic: address, city, state, zipCode, latitude, longitude
  - Size & Rooms: sqft, bedrooms, bathrooms, bathsFull, bathsHalf, totalRooms
  - Building: stories, basementSqft, garageSqft, garageType, fireplaceCount, hasFireplace, poolType
  - Construction: yearBuilt, yearBuiltEffective, constructionType, roofType, condition, quality, architecturalStyle
  - Utilities: heatingType, heatingFuel, coolingType
  - Lot: lotSize, lotSizeSqft, lotSizeAcres
  - Legal: attomId, apn, ownerOccupied, subdivision, legalDescription, zoning, viewType
- **watchlistItems** - User's saved properties
- **checklistItems** - 14-point due diligence items per property
- **propertyVisits** - GPS verification records
- **propertyFlags** - Community buyer insights:
  - category: structural, legal, condition, neighborhood, other
  - severity: info, note, concern
  - description, isAnonymous, contributorHasVisited, helpfulCount

## External API Integrations

- **Google Places API** - Address autocomplete with 300ms debounce
- **ATTOM API** - Comprehensive property data from public records

## Running the Project

The application runs on port 5000 with `npm run dev`.

## Design System

- High-contrast palette for outdoor mobile use
- Large touch targets (min 44x44px)
- Mobile bottom navigation
- Clean, functional design without marketing distractions
