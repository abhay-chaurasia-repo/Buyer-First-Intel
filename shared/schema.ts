import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Replit Auth models
export * from "./models/auth";

// Property records for buyer research
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  normalizedAddress: text("normalized_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  sqft: integer("sqft"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  yearBuilt: integer("year_built"),
  lotSize: text("lot_size"),
  propertyType: text("property_type"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  dataSource: text("data_source"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  // Extended ATTOM data
  attomId: text("attom_id"),
  apn: text("apn"),
  // Building details
  bathsFull: integer("baths_full"),
  bathsHalf: integer("baths_half"),
  totalRooms: integer("total_rooms"),
  stories: integer("stories"),
  basementSqft: integer("basement_sqft"),
  garageSqft: integer("garage_sqft"),
  garageType: text("garage_type"),
  fireplaceCount: integer("fireplace_count"),
  hasFireplace: boolean("has_fireplace"),
  poolType: text("pool_type"),
  // Construction
  constructionType: text("construction_type"),
  roofType: text("roof_type"),
  condition: text("condition"),
  quality: text("quality"),
  architecturalStyle: text("architectural_style"),
  yearBuiltEffective: integer("year_built_effective"),
  // Utilities
  heatingType: text("heating_type"),
  heatingFuel: text("heating_fuel"),
  coolingType: text("cooling_type"),
  // Lot details
  lotSizeSqft: integer("lot_size_sqft"),
  lotSizeAcres: text("lot_size_acres"),
  // Ownership
  ownerOccupied: boolean("owner_occupied"),
  subdivision: text("subdivision"),
  legalDescription: text("legal_description"),
  zoning: text("zoning"),
  // View/Features
  viewType: text("view_type"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  lastUpdated: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Watchlist for saved properties
export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
  priority: integer("priority").default(0),
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({
  id: true,
  addedAt: true,
});

export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type WatchlistItem = typeof watchlistItems.$inferSelect;

// 14-point due diligence checklist items
export const checklistCategories = ["physical", "legal", "neighborhood"] as const;

export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  category: text("category").notNull(), // physical, legal, neighborhood
  itemKey: text("item_key").notNull(),
  itemLabel: text("item_label").notNull(),
  isCompleted: boolean("is_completed").default(false),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
});

export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({
  id: true,
  completedAt: true,
});

export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type ChecklistItem = typeof checklistItems.$inferSelect;

// GPS visit verifications
export const propertyVisits = pgTable("property_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  visitedAt: timestamp("visited_at").defaultNow(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  verified: boolean("verified").default(false),
  distanceMeters: integer("distance_meters"),
});

export const insertPropertyVisitSchema = createInsertSchema(propertyVisits).omit({
  id: true,
  visitedAt: true,
});

export type InsertPropertyVisit = z.infer<typeof insertPropertyVisitSchema>;
export type PropertyVisit = typeof propertyVisits.$inferSelect;

// Default checklist template (14 points)
export const defaultChecklistTemplate = [
  // Physical Audit (6 items)
  { category: "physical", itemKey: "roof_condition", itemLabel: "Roof Condition & Age" },
  { category: "physical", itemKey: "foundation", itemLabel: "Foundation & Structural Integrity" },
  { category: "physical", itemKey: "hvac_system", itemLabel: "HVAC System & Age" },
  { category: "physical", itemKey: "plumbing", itemLabel: "Plumbing & Water Heater" },
  { category: "physical", itemKey: "electrical", itemLabel: "Electrical Panel & Wiring" },
  { category: "physical", itemKey: "windows_doors", itemLabel: "Windows & Doors Condition" },
  // Legal (4 items)
  { category: "legal", itemKey: "title_search", itemLabel: "Title Search Complete" },
  { category: "legal", itemKey: "liens", itemLabel: "Liens & Encumbrances Check" },
  { category: "legal", itemKey: "permits", itemLabel: "Permit History Reviewed" },
  { category: "legal", itemKey: "zoning", itemLabel: "Zoning & Land Use Verified" },
  // Neighborhood (4 items)
  { category: "neighborhood", itemKey: "crime_stats", itemLabel: "Crime Statistics Reviewed" },
  { category: "neighborhood", itemKey: "schools", itemLabel: "School District Ratings" },
  { category: "neighborhood", itemKey: "flood_zone", itemLabel: "Flood Zone Status" },
  { category: "neighborhood", itemKey: "commute", itemLabel: "Commute & Transit Access" },
];
