import { 
  type Property, type InsertProperty,
  type WatchlistItem, type InsertWatchlistItem,
  type ChecklistItem, type InsertChecklistItem,
  type PropertyVisit, type InsertPropertyVisit,
  properties, watchlistItems, checklistItems, propertyVisits,
  defaultChecklistTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc } from "drizzle-orm";

export interface IStorage {
  // Properties
  getProperty(id: string): Promise<Property | undefined>;
  getProperties(): Promise<Property[]>;
  searchProperties(query: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  createPropertyIfNotExists(property: InsertProperty): Promise<Property>;
  
  // Watchlist
  getWatchlist(): Promise<(WatchlistItem & { property: Property })[]>;
  getWatchlistIds(): Promise<string[]>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeFromWatchlist(propertyId: string): Promise<void>;
  isInWatchlist(propertyId: string): Promise<boolean>;
  
  // Checklist
  getChecklist(propertyId: string): Promise<ChecklistItem[]>;
  initializeChecklist(propertyId: string): Promise<ChecklistItem[]>;
  updateChecklistItem(id: string, updates: Partial<ChecklistItem>): Promise<ChecklistItem | undefined>;
  
  // Visits
  getVisits(propertyId: string): Promise<PropertyVisit[]>;
  recordVisit(visit: InsertPropertyVisit): Promise<PropertyVisit>;
  
  // Seed data
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Properties
  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async getProperties(): Promise<Property[]> {
    return db.select().from(properties).orderBy(desc(properties.lastUpdated));
  }

  async searchProperties(query: string): Promise<Property[]> {
    const normalizedQuery = query.toLowerCase().trim();
    return db.select().from(properties).where(
      or(
        ilike(properties.address, `%${normalizedQuery}%`),
        ilike(properties.normalizedAddress, `%${normalizedQuery}%`),
        ilike(properties.city, `%${normalizedQuery}%`),
        ilike(properties.zipCode, `%${normalizedQuery}%`)
      )
    );
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async createPropertyIfNotExists(property: InsertProperty): Promise<Property> {
    const existing = await db.select().from(properties).where(
      eq(properties.normalizedAddress, property.normalizedAddress)
    );
    if (existing.length > 0) {
      // Update existing property with any new ATTOM data
      const updateData: Partial<InsertProperty> = {};
      const fieldsToUpdate = [
        'sqft', 'bedrooms', 'bathrooms', 'yearBuilt', 'lotSize', 'propertyType',
        'latitude', 'longitude', 'dataSource', 'attomId', 'apn', 'bathsFull', 
        'bathsHalf', 'totalRooms', 'stories', 'basementSqft', 'garageSqft', 
        'garageType', 'fireplaceCount', 'hasFireplace', 'poolType', 'constructionType',
        'roofType', 'condition', 'quality', 'architecturalStyle', 'yearBuiltEffective',
        'heatingType', 'heatingFuel', 'coolingType', 'lotSizeSqft', 'lotSizeAcres',
        'ownerOccupied', 'subdivision', 'legalDescription', 'zoning', 'viewType'
      ] as const;
      
      for (const field of fieldsToUpdate) {
        const newValue = property[field];
        if (newValue !== undefined && newValue !== null) {
          (updateData as any)[field] = newValue;
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        const [updated] = await db.update(properties)
          .set({ ...updateData, lastUpdated: new Date() })
          .where(eq(properties.id, existing[0].id))
          .returning();
        return updated;
      }
      return existing[0];
    }
    return this.createProperty(property);
  }

  // Watchlist
  async getWatchlist(): Promise<(WatchlistItem & { property: Property })[]> {
    const items = await db.select().from(watchlistItems).orderBy(desc(watchlistItems.addedAt));
    const results: (WatchlistItem & { property: Property })[] = [];
    
    for (const item of items) {
      const property = await this.getProperty(item.propertyId);
      if (property) {
        results.push({ ...item, property });
      }
    }
    
    return results;
  }

  async getWatchlistIds(): Promise<string[]> {
    const items = await db.select({ propertyId: watchlistItems.propertyId }).from(watchlistItems);
    return items.map(i => i.propertyId);
  }

  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    // Check if already exists
    const existing = await db.select().from(watchlistItems).where(
      eq(watchlistItems.propertyId, item.propertyId)
    );
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [created] = await db.insert(watchlistItems).values(item).returning();
    return created;
  }

  async removeFromWatchlist(propertyId: string): Promise<void> {
    await db.delete(watchlistItems).where(eq(watchlistItems.propertyId, propertyId));
  }

  async isInWatchlist(propertyId: string): Promise<boolean> {
    const items = await db.select().from(watchlistItems).where(
      eq(watchlistItems.propertyId, propertyId)
    );
    return items.length > 0;
  }

  // Checklist
  async getChecklist(propertyId: string): Promise<ChecklistItem[]> {
    const items = await db.select().from(checklistItems).where(
      eq(checklistItems.propertyId, propertyId)
    );
    
    // Initialize if empty
    if (items.length === 0) {
      return this.initializeChecklist(propertyId);
    }
    
    return items;
  }

  async initializeChecklist(propertyId: string): Promise<ChecklistItem[]> {
    const newItems: InsertChecklistItem[] = defaultChecklistTemplate.map(item => ({
      propertyId,
      category: item.category,
      itemKey: item.itemKey,
      itemLabel: item.itemLabel,
      isCompleted: false,
      notes: null,
    }));
    
    const created = await db.insert(checklistItems).values(newItems).returning();
    return created;
  }

  async updateChecklistItem(id: string, updates: Partial<ChecklistItem>): Promise<ChecklistItem | undefined> {
    const updateData: Partial<ChecklistItem> = {};
    
    if (typeof updates.isCompleted === "boolean") {
      updateData.isCompleted = updates.isCompleted;
      if (updates.isCompleted) {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }
    
    if (typeof updates.notes === "string") {
      updateData.notes = updates.notes;
    }
    
    const [updated] = await db.update(checklistItems)
      .set(updateData)
      .where(eq(checklistItems.id, id))
      .returning();
    
    return updated;
  }

  // Visits
  async getVisits(propertyId: string): Promise<PropertyVisit[]> {
    return db.select().from(propertyVisits)
      .where(eq(propertyVisits.propertyId, propertyId))
      .orderBy(desc(propertyVisits.visitedAt));
  }

  async recordVisit(visit: InsertPropertyVisit): Promise<PropertyVisit> {
    const [created] = await db.insert(propertyVisits).values(visit).returning();
    return created;
  }

  // Seed data
  async seedData(): Promise<void> {
    const existingProperties = await db.select().from(properties);
    if (existingProperties.length > 0) {
      return; // Already seeded
    }

    const seedProperties: InsertProperty[] = [
      {
        address: "123 Oak Street",
        normalizedAddress: "123 oak street austin tx 78701",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        sqft: 2400,
        bedrooms: 4,
        bathrooms: 3,
        yearBuilt: 1998,
        lotSize: "0.25 acres",
        propertyType: "Single Family",
        latitude: "30.2672",
        longitude: "-97.7431",
        dataSource: "County Records"
      },
      {
        address: "456 Maple Avenue",
        normalizedAddress: "456 maple avenue austin tx 78702",
        city: "Austin",
        state: "TX",
        zipCode: "78702",
        sqft: 1850,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2015,
        lotSize: "0.18 acres",
        propertyType: "Single Family",
        latitude: "30.2621",
        longitude: "-97.7204",
        dataSource: "County Records"
      },
      {
        address: "789 Cedar Lane",
        normalizedAddress: "789 cedar lane austin tx 78704",
        city: "Austin",
        state: "TX",
        zipCode: "78704",
        sqft: 3200,
        bedrooms: 5,
        bathrooms: 4,
        yearBuilt: 2020,
        lotSize: "0.35 acres",
        propertyType: "Single Family",
        latitude: "30.2440",
        longitude: "-97.7663",
        dataSource: "County Records"
      },
      {
        address: "321 Pine Road",
        normalizedAddress: "321 pine road denver co 80202",
        city: "Denver",
        state: "CO",
        zipCode: "80202",
        sqft: 1600,
        bedrooms: 2,
        bathrooms: 2,
        yearBuilt: 2010,
        lotSize: "0.12 acres",
        propertyType: "Townhouse",
        latitude: "39.7392",
        longitude: "-104.9903",
        dataSource: "County Records"
      },
      {
        address: "555 Birch Boulevard",
        normalizedAddress: "555 birch boulevard seattle wa 98101",
        city: "Seattle",
        state: "WA",
        zipCode: "98101",
        sqft: 2100,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2005,
        lotSize: "0.20 acres",
        propertyType: "Single Family",
        latitude: "47.6062",
        longitude: "-122.3321",
        dataSource: "County Records"
      }
    ];

    for (const property of seedProperties) {
      await db.insert(properties).values(property);
    }
  }
}

export const storage = new DatabaseStorage();
