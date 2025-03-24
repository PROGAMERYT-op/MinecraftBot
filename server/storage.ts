import { bots, type Bot, type InsertBot } from "@shared/schema";

export interface IStorage {
  createBot(bot: InsertBot): Promise<Bot>;
  getBot(id: number): Promise<Bot | undefined>;
  updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined>;
  getBotByName(name: string): Promise<Bot | undefined>;
  getAllBots(): Promise<Bot[]>;
  deleteBot(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private bots: Map<number, Bot>;
  private currentId: number;

  constructor() {
    this.bots = new Map();
    this.currentId = 1;
  }

  async createBot(bot: InsertBot): Promise<Bot> {
    const id = this.currentId++;
    const newBot: Bot = { 
      ...bot, 
      id, 
      connected: false,
      health: 20,
      food: 20
    };
    this.bots.set(id, newBot);
    return newBot;
  }

  async getBot(id: number): Promise<Bot | undefined> {
    return this.bots.get(id);
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) return undefined;
    
    const updatedBot = { ...bot, ...updates };
    this.bots.set(id, updatedBot);
    return updatedBot;
  }

  async getBotByName(name: string): Promise<Bot | undefined> {
    return Array.from(this.bots.values()).find(
      (bot) => bot.name === name,
    );
  }

  async getAllBots(): Promise<Bot[]> {
    return Array.from(this.bots.values());
  }

  async deleteBot(id: number): Promise<boolean> {
    return this.bots.delete(id);
  }
}

export const storage = new MemStorage();
