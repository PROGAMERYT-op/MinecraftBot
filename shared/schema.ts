import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Bot data model
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  server: text("server").notNull(),
  connected: boolean("connected").default(false),
  health: integer("health").default(20),
  food: integer("food").default(20),
});

export const insertBotSchema = createInsertSchema(bots).pick({
  name: true,
  server: true,
});

export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof bots.$inferSelect;

// Connection schema for validation
export const connectionSchema = z.object({
  botName: z.string().min(3, "Bot name must be at least 3 characters"),
  botCount: z.number().int().min(1).max(10, "Maximum 10 bots allowed"),
  serverIp: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:[0-9]{1,5})?$/, "Enter a valid server address (e.g., play.example.com:25565)")
});

export type ConnectionDetails = z.infer<typeof connectionSchema>;

// Message types for WebSocket communication
export type WebSocketMessage = 
  | { type: 'connect', data: ConnectionDetails }
  | { type: 'disconnect' }
  | { type: 'cancel' }
  | { type: 'getBotInfo' }
  | { type: 'control', action: string }
  | { type: 'chat', message: string };

export type WebSocketResponse =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'error', message: string }
  | { type: 'botInfo', data: { name: string, count: number, serverIp: string, health: number, food: number } }
  | { type: 'chat', message: { username: string, content: string, timestamp: number } };
