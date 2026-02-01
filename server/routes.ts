import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
    sqft: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    yearBuilt: z.number().optional(),
    lotSize: z.string().optional(),
    propertyType: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    dataSource: z.string().optional(),
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

  return httpServer;
}
