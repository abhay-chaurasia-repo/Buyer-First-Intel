const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs = require('fs');

async function generateDocs() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Buyer-First Intel (BFI) API Documentation",
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          text: "Version 1.0 | Generated: " + new Date().toLocaleDateString(),
          spacing: { after: 400 },
        }),
        
        new Paragraph({
          text: "Overview",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "Buyer-First Intel is a mobile-first property audit platform for U.S. home buyers. This document describes the REST API endpoints available for integration.",
          spacing: { after: 200 },
        }),

        new Paragraph({
          text: "Base URL",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: "All API endpoints are relative to your deployment URL (e.g., https://your-app.replit.app)",
          spacing: { after: 400 },
        }),

        new Paragraph({
          text: "Properties API",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          text: "GET /api/properties",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "List all properties in the database.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Array of Property objects")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "GET /api/properties/:id",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get a specific property by ID.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("id (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Property object or 404")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "GET /api/properties/search/:query",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Search properties by address.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("query (string) - Search term")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Array of matching Property objects")] }),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        new Paragraph({
          text: "Visits API",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          text: "GET /api/visits/:propertyId",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get visit history for a property.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("propertyId (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Array of PropertyVisit objects")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "GET /api/visits/:propertyId/count",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get count of verified visits for a property. Only counts visits where user was within 100 meters.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("propertyId (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("{ count: number }")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "POST /api/visits",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Record a GPS visit verification.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Request Body:", bold: true })] }),
        new Paragraph({ text: "  • propertyId (string) - Property UUID" }),
        new Paragraph({ text: "  • latitude (string) - User's GPS latitude" }),
        new Paragraph({ text: "  • longitude (string) - User's GPS longitude" }),
        new Paragraph({ text: "  • distanceMeters (number) - Distance from property" }),
        new Paragraph({ text: "  • verified (boolean) - True if within 100m" }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Created PropertyVisit object")] }),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        new Paragraph({
          text: "Buyer Insights API",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          text: "GET /api/flags/:propertyId",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get all buyer insights (community notes) for a property.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("propertyId (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Array of PropertyFlag objects")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "GET /api/flags/:propertyId/count",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get count of buyer insights for a property.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("propertyId (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("{ count: number }")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "POST /api/flags",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Submit a new buyer insight.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Request Body:", bold: true })] }),
        new Paragraph({ text: "  • propertyId (string) - Property UUID" }),
        new Paragraph({ text: "  • userId (string) - User identifier" }),
        new Paragraph({ text: "  • category (string) - One of: structural, legal, condition, neighborhood, other" }),
        new Paragraph({ text: "  • severity (string) - One of: info, note, concern" }),
        new Paragraph({ text: "  • title (string) - Brief title (1-100 chars)" }),
        new Paragraph({ text: "  • description (string) - Detailed description (1-1000 chars)" }),
        new Paragraph({ text: "  • isAnonymous (boolean, optional) - Hide contributor name" }),
        new Paragraph({ text: "  • contributorHasVisited (boolean, optional) - Indicates verified visit" }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Created PropertyFlag object")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "POST /api/flags/:flagId/helpful",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Mark an insight as helpful.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("flagId (string) - Insight UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Request Body: ", bold: true }), new TextRun("{ userId: string }")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("{ success: true }")] }),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        new Paragraph({
          text: "Watchlist API",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          text: "GET /api/watchlist",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get user's saved properties with full property details.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Array of WatchlistItem objects with nested Property")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "GET /api/watchlist/ids",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Get just the property IDs on watchlist (for quick checking).", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Array of property ID strings")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "POST /api/watchlist",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Add a property to watchlist.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Request Body: ", bold: true }), new TextRun("{ propertyId: string }")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Created WatchlistItem object")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "DELETE /api/watchlist/:propertyId",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Remove a property from watchlist.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("propertyId (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("204 No Content")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "PATCH /api/watchlist/:propertyId/status",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "Update watchlist item status.", spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Parameters: ", bold: true }), new TextRun("propertyId (string) - Property UUID")] }),
        new Paragraph({ children: [new TextRun({ text: "Request Body: ", bold: true }), new TextRun("{ status: string }")] }),
        new Paragraph({ text: "  Valid statuses: researching, visited, audited, decision" }),
        new Paragraph({ children: [new TextRun({ text: "Response: ", bold: true }), new TextRun("Updated WatchlistItem object")] }),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        new Paragraph({
          text: "Data Models",
          heading: HeadingLevel.HEADING_1,
        }),

        new Paragraph({
          text: "Property",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "  • id (string) - UUID" }),
        new Paragraph({ text: "  • address, city, state, zipCode (string)" }),
        new Paragraph({ text: "  • latitude, longitude (string, nullable)" }),
        new Paragraph({ text: "  • sqft, bedrooms, bathrooms (number, nullable)" }),
        new Paragraph({ text: "  • yearBuilt (number, nullable)" }),
        new Paragraph({ text: "  • lotSize (string, nullable)" }),
        new Paragraph({ text: "  • Additional ATTOM fields: stories, basementSqft, garageSqft, etc." }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "PropertyVisit",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "  • id (string) - UUID" }),
        new Paragraph({ text: "  • propertyId (string) - Property UUID" }),
        new Paragraph({ text: "  • latitude, longitude (string)" }),
        new Paragraph({ text: "  • distanceMeters (number)" }),
        new Paragraph({ text: "  • verified (boolean) - True if within 100m" }),
        new Paragraph({ text: "  • visitedAt (timestamp)" }),
        new Paragraph({ text: "  • notes (string, nullable)" }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "PropertyFlag (Buyer Insight)",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "  • id (string) - UUID" }),
        new Paragraph({ text: "  • propertyId (string) - Property UUID" }),
        new Paragraph({ text: "  • userId (string) - Contributor ID" }),
        new Paragraph({ text: "  • category (string) - structural/legal/condition/neighborhood/other" }),
        new Paragraph({ text: "  • severity (string) - info/note/concern" }),
        new Paragraph({ text: "  • title (string)" }),
        new Paragraph({ text: "  • description (string)" }),
        new Paragraph({ text: "  • isAnonymous (boolean)" }),
        new Paragraph({ text: "  • contributorHasVisited (boolean)" }),
        new Paragraph({ text: "  • helpfulCount (number)" }),
        new Paragraph({ text: "  • createdAt (timestamp)" }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({
          text: "WatchlistItem",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "  • id (string) - UUID" }),
        new Paragraph({ text: "  • propertyId (string) - Property UUID" }),
        new Paragraph({ text: "  • status (string) - researching/visited/audited/decision" }),
        new Paragraph({ text: "  • addedAt (timestamp)" }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('BFI_API_Documentation.docx', buffer);
  console.log('Documentation generated: BFI_API_Documentation.docx');
}

generateDocs().catch(console.error);
