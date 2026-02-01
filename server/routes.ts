import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ATTOM_API_KEY = process.env.ATTOM_API_KEY;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth (BEFORE other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Seed data on startup
  await storage.seedData();

  // Properties
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      const properties = await storage.searchProperties(query);
      res.json(properties);
    } catch (error) {
      console.error("Error searching properties:", error);
      res.status(500).json({ error: "Failed to search properties" });
    }
  });

  // Google Places Autocomplete API proxy
  app.get("/api/places/autocomplete", async (req, res) => {
    try {
      const { input } = req.query;
      
      if (!input || typeof input !== "string") {
        return res.status(400).json({ error: "Missing input parameter" });
      }
      
      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({ error: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        res.json({
          predictions: data.predictions?.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text,
            secondaryText: p.structured_formatting?.secondary_text,
          })) || []
        });
      } else {
        console.error("Google Places API error:", data.status, data.error_message);
        res.status(500).json({ error: "Places API error", status: data.status });
      }
    } catch (error) {
      console.error("Error fetching place autocomplete:", error);
      res.status(500).json({ error: "Failed to fetch address suggestions" });
    }
  });

  // Google Places Details API proxy (to get full address components)
  app.get("/api/places/details/:placeId", async (req, res) => {
    try {
      const { placeId } = req.params;
      
      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({ error: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,address_components,geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === "OK" && data.result) {
        const result = data.result;
        const components = result.address_components || [];
        
        const getComponent = (type: string) => 
          components.find((c: any) => c.types.includes(type))?.long_name || "";
        const getShortComponent = (type: string) =>
          components.find((c: any) => c.types.includes(type))?.short_name || "";
        
        res.json({
          formattedAddress: result.formatted_address,
          streetNumber: getComponent("street_number"),
          street: getComponent("route"),
          city: getComponent("locality") || getComponent("sublocality") || getComponent("administrative_area_level_2"),
          state: getShortComponent("administrative_area_level_1"),
          zipCode: getComponent("postal_code"),
          latitude: result.geometry?.location?.lat?.toString(),
          longitude: result.geometry?.location?.lng?.toString(),
        });
      } else {
        console.error("Google Places Details API error:", data.status);
        res.status(500).json({ error: "Places Details API error", status: data.status });
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ error: "Failed to fetch place details" });
    }
  });

  // ATTOM API - Fetch property details by address
  app.get("/api/attom/property", async (req, res) => {
    try {
      const { address1, address2 } = req.query;
      
      if (!address1 || !address2 || typeof address1 !== "string" || typeof address2 !== "string") {
        return res.status(400).json({ error: "Missing address1 or address2 parameters" });
      }
      
      if (!ATTOM_API_KEY) {
        return res.status(500).json({ error: "ATTOM API key not configured" });
      }

      const url = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "apikey": ATTOM_API_KEY,
        },
      });
      
      const data = await response.json();
      
      if (data.status?.code === 0 && data.property?.[0]) {
        const prop = data.property[0];
        const building = prop.building || {};
        const lot = prop.lot || {};
        const address = prop.address || {};
        const location = prop.location || {};
        const summary = prop.summary || {};
        const utilities = prop.utilities || {};
        const area = prop.area || {};
        const interior = building.interior || {};
        const construction = building.construction || {};
        const parking = building.parking || {};
        const buildingSummary = building.summary || {};
        const rooms = building.rooms || {};
        const size = building.size || {};
        const roof = building.roof || {};
        
        const toNumber = (val: any): number | null => {
          if (val === null || val === undefined || val === "") return null;
          const num = Number(val);
          return isNaN(num) ? null : num;
        };
        
        res.json({
          success: true,
          property: {
            // Basic info
            address: address.line1 || address1,
            city: address.locality || "",
            state: address.countrySubd || "",
            zipCode: address.postal1 || "",
            // Size & rooms - handle both camelCase and lowercase ATTOM field names
            sqft: toNumber(size.livingsize) || toNumber(size.livingSize) || toNumber(size.universalsize) || toNumber(size.universalSize),
            bedrooms: toNumber(rooms.beds),
            bathrooms: toNumber(rooms.bathstotal) || toNumber(rooms.bathsTotal),
            bathsFull: toNumber(rooms.bathsfull) || toNumber(rooms.bathsFull),
            bathsHalf: toNumber(rooms.bathspartial) || toNumber(rooms.bathsHalf),
            totalRooms: toNumber(rooms.roomsTotal) || toNumber(rooms.roomstotal),
            // Building
            yearBuilt: toNumber(summary.yearbuilt) || toNumber(summary.yearBuilt),
            yearBuiltEffective: toNumber(buildingSummary.yearbuilteffective) || toNumber(buildingSummary.yearBuiltEffective),
            stories: toNumber(buildingSummary.levels),
            basementSqft: toNumber(interior.bsmtsize) || toNumber(interior.bsmtSize),
            garageSqft: toNumber(parking.prkgSize),
            garageType: parking.garageType || parking.garagetype || parking.prkgType || null,
            fireplaceCount: toNumber(interior.fplccount) || toNumber(interior.fplcCount),
            hasFireplace: interior.fplcind === "Y" || interior.fplcInd === "Y" || (toNumber(interior.fplccount) || 0) > 0,
            poolType: lot.pooltype || lot.poolType || null,
            // Construction
            constructionType: construction.wallType || construction.walltype || null,
            roofType: roof.roofType || roof.rooftype || roof.roofCover || roof.roofcover || null,
            condition: construction.condition || null,
            quality: buildingSummary.quality || null,
            architecturalStyle: buildingSummary.archStyle || buildingSummary.archstyle || null,
            // Utilities
            heatingType: utilities.heatingtype || utilities.heatingType || null,
            heatingFuel: utilities.heatingfuel || utilities.heatingFuel || null,
            coolingType: utilities.coolingtype || utilities.coolingType || null,
            // Lot - handle both camelCase and lowercase from ATTOM
            lotSize: (lot.lotsize1 || lot.lotSize1) ? `${Number(lot.lotsize1 || lot.lotSize1).toFixed(2)} acres` : null,
            lotSizeSqft: toNumber(lot.lotsize2) || toNumber(lot.lotSize2),
            lotSizeAcres: (lot.lotsize1 || lot.lotSize1)?.toString() || null,
            // Property type
            propertyType: summary.propclass || summary.propType || summary.propSubType || null,
            // Location
            latitude: location.latitude?.toString() || null,
            longitude: location.longitude?.toString() || null,
            // IDs
            attomId: prop.identifier?.attomId?.toString() || prop.identifier?.Id?.toString() || null,
            apn: prop.identifier?.apn || null,
            // Ownership & legal
            ownerOccupied: summary.absenteeInd === "OWNER OCCUPIED",
            subdivision: area.subdname || area.subdName || null,
            legalDescription: summary.legal1 || null,
            zoning: (area.countyuse1 || area.countyUse1)?.trim() || null,
            viewType: buildingSummary.view || null,
          },
        });
      } else {
        console.error("ATTOM API error:", data.status?.msg || "Unknown error");
        res.json({
          success: false,
          error: data.status?.msg || "Property not found",
        });
      }
    } catch (error) {
      console.error("Error fetching ATTOM property:", error);
      res.status(500).json({ error: "Failed to fetch property details from ATTOM" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  const createPropertySchema = z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    sqft: z.number().optional().nullable(),
    bedrooms: z.number().optional().nullable(),
    bathrooms: z.number().optional().nullable(),
    yearBuilt: z.number().optional().nullable(),
    lotSize: z.string().optional().nullable(),
    propertyType: z.string().optional().nullable(),
    latitude: z.string().optional().nullable(),
    longitude: z.string().optional().nullable(),
    dataSource: z.string().optional().nullable(),
    // Extended ATTOM fields
    attomId: z.string().optional().nullable(),
    apn: z.string().optional().nullable(),
    bathsFull: z.number().optional().nullable(),
    bathsHalf: z.number().optional().nullable(),
    totalRooms: z.number().optional().nullable(),
    stories: z.number().optional().nullable(),
    basementSqft: z.number().optional().nullable(),
    garageSqft: z.number().optional().nullable(),
    garageType: z.string().optional().nullable(),
    fireplaceCount: z.number().optional().nullable(),
    hasFireplace: z.boolean().optional().nullable(),
    poolType: z.string().optional().nullable(),
    constructionType: z.string().optional().nullable(),
    roofType: z.string().optional().nullable(),
    condition: z.string().optional().nullable(),
    quality: z.string().optional().nullable(),
    architecturalStyle: z.string().optional().nullable(),
    yearBuiltEffective: z.number().optional().nullable(),
    heatingType: z.string().optional().nullable(),
    heatingFuel: z.string().optional().nullable(),
    coolingType: z.string().optional().nullable(),
    lotSizeSqft: z.number().optional().nullable(),
    lotSizeAcres: z.string().optional().nullable(),
    ownerOccupied: z.boolean().optional().nullable(),
    subdivision: z.string().optional().nullable(),
    legalDescription: z.string().optional().nullable(),
    zoning: z.string().optional().nullable(),
    viewType: z.string().optional().nullable(),
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const data = createPropertySchema.parse(req.body);
      const normalizedAddress = `${data.address} ${data.city} ${data.state} ${data.zipCode}`.toLowerCase();
      
      const property = await storage.createPropertyIfNotExists({
        ...data,
        normalizedAddress,
      });
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid property data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  // Watchlist
  app.get("/api/watchlist", async (req, res) => {
    try {
      const watchlist = await storage.getWatchlist();
      res.json(watchlist);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.get("/api/watchlist/ids", async (req, res) => {
    try {
      const ids = await storage.getWatchlistIds();
      res.json(ids);
    } catch (error) {
      console.error("Error fetching watchlist ids:", error);
      res.status(500).json({ error: "Failed to fetch watchlist ids" });
    }
  });

  const addToWatchlistSchema = z.object({
    propertyId: z.string().min(1),
    notes: z.string().optional(),
    priority: z.number().optional(),
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const data = addToWatchlistSchema.parse(req.body);
      const item = await storage.addToWatchlist(data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid watchlist data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      await storage.removeFromWatchlist(propertyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Checklist
  app.get("/api/checklist/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const checklist = await storage.getChecklist(propertyId);
      res.json(checklist);
    } catch (error) {
      console.error("Error fetching checklist:", error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  const updateChecklistItemSchema = z.object({
    isCompleted: z.boolean().optional(),
    notes: z.string().optional(),
  });

  app.patch("/api/checklist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateChecklistItemSchema.parse(req.body);
      const item = await storage.updateChecklistItem(id, data);
      if (!item) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid checklist data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });

  // Visits
  app.get("/api/visits/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const visits = await storage.getVisits(propertyId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  const recordVisitSchema = z.object({
    propertyId: z.string().min(1),
    latitude: z.string(),
    longitude: z.string(),
    distanceMeters: z.number(),
    verified: z.boolean(),
  });

  app.post("/api/visits", async (req, res) => {
    try {
      const data = recordVisitSchema.parse(req.body);
      const visit = await storage.recordVisit(data);
      res.status(201).json(visit);
    } catch (error) {
      console.error("Error recording visit:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid visit data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to record visit" });
    }
  });

  // Audit Score - Calculate letter grade based on checklist completion
  app.get("/api/audit-score/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const checklist = await storage.getChecklist(propertyId);
      const visits = await storage.getVisits(propertyId);
      
      if (checklist.length === 0) {
        return res.json({
          score: null,
          grade: null,
          completedItems: 0,
          totalItems: 0,
          hasVerifiedVisit: false,
          message: "No audit started",
        });
      }

      const completedItems = checklist.filter(item => item.isCompleted).length;
      const totalItems = checklist.length;
      const hasVerifiedVisit = visits.some(v => v.verified);
      
      // Base score from checklist completion (0-100)
      let score = Math.round((completedItems / totalItems) * 100);
      
      // Bonus points for verified visit (+5%)
      if (hasVerifiedVisit) {
        score = Math.min(100, score + 5);
      }

      // Calculate letter grade
      let grade: string;
      if (score >= 90) grade = "A";
      else if (score >= 80) grade = "B";
      else if (score >= 70) grade = "C";
      else if (score >= 60) grade = "D";
      else grade = "F";

      res.json({
        score,
        grade,
        completedItems,
        totalItems,
        hasVerifiedVisit,
        message: `${completedItems}/${totalItems} items completed`,
      });
    } catch (error) {
      console.error("Error calculating audit score:", error);
      res.status(500).json({ error: "Failed to calculate audit score" });
    }
  });

  // Watchlist status update
  const updateWatchlistStatusSchema = z.object({
    status: z.enum(["researching", "visited", "audited", "decision"]),
  });

  app.patch("/api/watchlist/:propertyId/status", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const data = updateWatchlistStatusSchema.parse(req.body);
      const item = await storage.updateWatchlistStatus(propertyId, data.status);
      if (!item) {
        return res.status(404).json({ error: "Watchlist item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating watchlist status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Visit notes update
  const updateVisitNotesSchema = z.object({
    notes: z.string(),
  });

  app.patch("/api/visits/:id/notes", async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateVisitNotesSchema.parse(req.body);
      const visit = await storage.updateVisitNotes(id, data.notes);
      if (!visit) {
        return res.status(404).json({ error: "Visit not found" });
      }
      res.json(visit);
    } catch (error) {
      console.error("Error updating visit notes:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid notes", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update notes" });
    }
  });

  return httpServer;
}
