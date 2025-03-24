import mineflayer from 'mineflayer';
import { Bot } from '@shared/schema';
import { storage } from './storage';
import { WebSocket } from 'ws';

interface ActiveBot {
  id: number;
  name: string;
  bot: mineflayer.Bot;
  server: string;
  port: number;
  clientId: string;
  health: number;
  food: number;
  chatMessages: { username: string; content: string; timestamp: number }[];
}

export class MinecraftBotManager {
  private activeBots: Map<string, ActiveBot> = new Map();
  private clientSockets: Map<string, WebSocket> = new Map();

  registerClient(clientId: string, socket: WebSocket) {
    this.clientSockets.set(clientId, socket);
  }

  unregisterClient(clientId: string) {
    // Disconnect any bots associated with this client
    this.activeBots.forEach((bot, botId) => {
      if (bot.clientId === clientId) {
        this.disconnectBot(botId);
      }
    });
    
    this.clientSockets.delete(clientId);
  }

  async createBot(
    botName: string, 
    serverAddress: string, 
    clientId: string
  ): Promise<string> {
    try {
      // Parse server address and port
      let server = serverAddress;
      let port = 25565; // Default Minecraft port
      
      if (serverAddress.includes(':')) {
        const parts = serverAddress.split(':');
        server = parts[0];
        port = parseInt(parts[1], 10);
      }

      // Create a unique bot ID
      const botId = `${botName}-${Date.now()}`;
      
      // Store bot in database
      const newBot = await storage.createBot({
        name: botName,
        server: serverAddress
      });
      
      // Create the bot with mineflayer
      const bot = mineflayer.createBot({
        host: server,
        port,
        username: botName,
        version: '1.20.1', // Default to latest version, could be configurable
        auth: 'offline' // For connecting to offline-mode servers
      });

      // Set up event handlers
      bot.once('spawn', () => {
        this.sendToClient(clientId, {
          type: 'connected'
        });
        
        storage.updateBot(newBot.id, { connected: true });
      });

      bot.on('health', () => {
        if (this.activeBots.has(botId)) {
          const activeBot = this.activeBots.get(botId)!;
          activeBot.health = bot.health;
          activeBot.food = bot.food;
          
          // Update database
          storage.updateBot(newBot.id, { 
            health: Math.round(bot.health),
            food: Math.round(bot.food)
          });
          
          // Send updated info to client
          this.sendToClient(clientId, {
            type: 'botInfo',
            data: {
              name: activeBot.name,
              count: 1, // Currently we create bots one at a time
              serverIp: serverAddress,
              health: bot.health,
              food: bot.food
            }
          });
        }
      });

      bot.on('message', (message) => {
        const msgText = message.toString();
        const username = message.username || 'SERVER';
        
        // Add message to chat history
        const chatMessage = {
          username,
          content: msgText,
          timestamp: Date.now()
        };
        
        if (this.activeBots.has(botId)) {
          const activeBot = this.activeBots.get(botId)!;
          activeBot.chatMessages.push(chatMessage);
          
          // Limit chat history to 100 messages
          if (activeBot.chatMessages.length > 100) {
            activeBot.chatMessages.shift();
          }
        }
        
        // Send to client
        this.sendToClient(clientId, {
          type: 'chat',
          message: chatMessage
        });
      });

      bot.on('kicked', (reason) => {
        this.sendToClient(clientId, {
          type: 'error',
          message: `Kicked from server: ${reason}`
        });
        
        this.disconnectBot(botId);
      });

      bot.on('error', (err) => {
        console.error('Bot error:', err);
        this.sendToClient(clientId, {
          type: 'error',
          message: `Bot error: ${err.message}`
        });
        
        this.disconnectBot(botId);
      });

      // Store the active bot
      this.activeBots.set(botId, {
        id: newBot.id,
        name: botName,
        bot,
        server,
        port,
        clientId,
        health: 20,
        food: 20,
        chatMessages: []
      });

      return botId;
    } catch (error) {
      console.error('Error creating bot:', error);
      throw new Error(`Failed to create bot: ${(error as Error).message}`);
    }
  }

  getBotInfo(botId: string) {
    const bot = this.activeBots.get(botId);
    if (!bot) return null;
    
    return {
      name: bot.name,
      count: 1, // We're creating bots one by one
      serverIp: `${bot.server}:${bot.port}`,
      health: bot.health,
      food: bot.food
    };
  }

  getChatHistory(botId: string) {
    return this.activeBots.get(botId)?.chatMessages || [];
  }

  controlBot(botId: string, action: string) {
    const botEntry = this.activeBots.get(botId);
    if (!botEntry) return false;
    
    const bot = botEntry.bot;
    
    try {
      switch (action) {
        case 'forward':
          bot.setControlState('forward', true);
          break;
        case 'backward':
          bot.setControlState('back', true);
          break;
        case 'left':
          bot.setControlState('left', true);
          break;
        case 'right':
          bot.setControlState('right', true);
          break;
        case 'stop':
          bot.clearControlStates();
          break;
        case 'jump':
          if (bot.entity.onGround) {
            bot.setControlState('jump', true);
            setTimeout(() => {
              bot.setControlState('jump', false);
            }, 100);
          }
          break;
        case 'attack':
          // Attack the entity the bot is looking at
          const entity = bot.nearestEntity();
          if (entity) {
            bot.attack(entity);
          }
          break;
        case 'use':
          // Use the item in hand or interact with a block
          bot.activateItem();
          break;
      }
      return true;
    } catch (error) {
      console.error('Error controlling bot:', error);
      return false;
    }
  }

  sendChatMessage(botId: string, message: string) {
    const botEntry = this.activeBots.get(botId);
    if (!botEntry) return false;
    
    try {
      botEntry.bot.chat(message);
      return true;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return false;
    }
  }

  disconnectBot(botId: string) {
    const botEntry = this.activeBots.get(botId);
    if (!botEntry) return false;
    
    try {
      botEntry.bot.quit();
      this.activeBots.delete(botId);
      storage.updateBot(botEntry.id, { connected: false });
      
      return true;
    } catch (error) {
      console.error('Error disconnecting bot:', error);
      return false;
    }
  }

  disconnectAllBots() {
    this.activeBots.forEach((bot, id) => {
      this.disconnectBot(id);
    });
  }

  private sendToClient(clientId: string, data: any) {
    const socket = this.clientSockets.get(clientId);
    if (socket && socket.readyState === 1) { // 1 = OPEN state for WebSocket
      socket.send(JSON.stringify(data));
    }
  }
}

export const botManager = new MinecraftBotManager();
