# Buyer-First Intel (BFI)

A mobile-first property audit platform for U.S. home buyers to research properties before making an offer.

## Overview

Buyer-First Intel is a buyer-only platform focused on property due diligence. It provides:
- Property fact sheets from public records
- 14-point due diligence checklist
- GPS visit verification
- Private watchlist for tracking properties

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
├── pages/
│   ├── Home.tsx        # Landing page
│   ├── SearchPage.tsx  # Property search
│   ├── PropertyPage.tsx # Property details
│   ├── WatchlistPage.tsx # Saved properties
│   ├── AuditPage.tsx   # Due diligence checklist
│   └── VerifyPage.tsx  # GPS verification
└── lib/                # Query client utilities

server/
├── routes.ts           # API endpoints
├── storage.ts          # Database operations
└── db.ts               # Database connection

shared/
└── schema.ts           # Data models (Drizzle schemas)
```

## Core Features

1. **Address Search** - Search for properties by address with normalization
2. **Property Fact Sheet** - View public records (sqft, bed/bath, year built)
3. **14-Point Checklist** - Physical, Legal, and Neighborhood audit items
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
- `POST /api/visits` - Record visit verification

## Database Schema

- **properties** - Property records with address, facts, coordinates
- **watchlistItems** - User's saved properties
- **checklistItems** - 14-point due diligence items per property
- **propertyVisits** - GPS verification records

## Running the Project

The application runs on port 5000 with `npm run dev`.

## Design System

- High-contrast palette for outdoor mobile use
- Large touch targets (min 44x44px)
- Mobile bottom navigation
- Clean, functional design without marketing distractions
