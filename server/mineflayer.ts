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

      console.log(`Creating bot with parameters:`, {
        host: server,
        port,
        username: botName
      });

      // Create a unique bot ID
      const botId = `${botName}-${Date.now()}`;
      
      // Store bot in database
      const newBot = await storage.createBot({
        name: botName,
        server: serverAddress
      });
      
      // Add proper error handling for connection issues
      this.sendToClient(clientId, {
        type: 'connected',
        data: {
          message: "Attempting to connect to server..."
        }
      });
      
      // Create the bot with mineflayer
      const bot = mineflayer.createBot({
        host: server,
        port,
        username: botName,
        version: '1.21.4', // Latest Minecraft version
        auth: 'offline', // For connecting to offline-mode servers
        viewDistance: 'tiny', // For performance
        checkTimeoutInterval: 60 * 1000, // 1 minute timeout
        logErrors: true 
      });
      
      // Store the active bot
      const activeBot: ActiveBot = {
        id: newBot.id,
        name: botName,
        bot,
        server,
        port,
        clientId,
        health: 20,
        food: 20,
        chatMessages: []
      };
      
      this.activeBots.set(botId, activeBot);
      
      // Set up event handlers
      this.setupBotEventHandlers(bot, botId, clientId, activeBot);

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
          bot.clearControlStates();
          bot.setControlState('forward', true);
          break;
        case 'backward':
          bot.clearControlStates();
          bot.setControlState('back', true);
          break;
        case 'left':
          bot.clearControlStates();
          bot.setControlState('left', true);
          break;
        case 'right':
          bot.clearControlStates();
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
  
  private setupBotEventHandlers(
    bot: mineflayer.Bot, 
    botId: string, 
    clientId: string, 
    activeBot: ActiveBot
  ) {
    // Clear existing timeout if any
    let connectionTimeout: NodeJS.Timeout;
    
    // Set up event handlers
    bot.once('spawn', () => {
      console.log(`Bot ${activeBot.name} has spawned successfully on ${activeBot.server}:${activeBot.port}`);
      this.sendToClient(clientId, {
        type: 'connected'
      });
      
      storage.updateBot(activeBot.id, { connected: true });
      
      // Clear timeout when bot spawns
      if (connectionTimeout) clearTimeout(connectionTimeout);
    });
    
    bot.once('login', () => {
      console.log(`Bot ${activeBot.name} logged in to ${activeBot.server}:${activeBot.port}`);
    });
    
    bot.on('end', (reason) => {
      console.log(`Bot ${activeBot.name} disconnected: ${reason}`);
      this.sendToClient(clientId, {
        type: 'error',
        message: `Bot disconnected: ${reason}`
      });
      this.disconnectBot(botId);
    });
    
    // Add timeout handling in case connection takes too long
    connectionTimeout = setTimeout(() => {
      if (this.activeBots.has(botId) && !bot.entity) {
        console.log(`Connection timeout for bot ${activeBot.name} to ${activeBot.server}:${activeBot.port}`);
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Connection timed out. The Minecraft server might be offline or unreachable. Please check the server address and try again later.'
        });
        this.disconnectBot(botId);
      }
    }, 20000); // 20 seconds timeout - more responsive
    
    // Clear timeout when bot encounters an error
    bot.once('error', () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
    });

    bot.on('health', () => {
      if (this.activeBots.has(botId)) {
        activeBot.health = bot.health;
        activeBot.food = bot.food;
        
        // Update database
        storage.updateBot(activeBot.id, { 
          health: Math.round(bot.health),
          food: Math.round(bot.food)
        });
        
        // Send updated info to client
        this.sendToClient(clientId, {
          type: 'botInfo',
          data: {
            name: activeBot.name,
            count: 1, // Currently we create bots one at a time
            serverIp: `${activeBot.server}:${activeBot.port}`,
            health: bot.health,
            food: bot.food
          }
        });
      }
    });

    bot.on('message', (message) => {
      const msgText = message.toString();
      // Handle username extraction safely
      const username = message.hasOwnProperty('username') 
        ? (message as any).username 
        : 'SERVER';
      
      // Add message to chat history
      const chatMessage = {
        username,
        content: msgText,
        timestamp: Date.now()
      };
      
      if (this.activeBots.has(botId)) {
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
      let kickReason = reason;
      try {
        if (typeof reason === 'object') {
          // Handle translation objects from server
          if (reason.translate && reason.with) {
            kickReason = `${reason.translate}: ${reason.with.join(' ')}`;
          } else {
            kickReason = JSON.stringify(reason);
          }
        }
      } catch (e) {
        kickReason = 'Unknown kick reason';
      }

      this.sendToClient(clientId, {
        type: 'error',
        message: `Kicked from server: ${kickReason}`
      });
      
      this.disconnectBot(botId);
    });

    bot.on('error', (err) => {
      console.error('Bot error:', err);
      
      // Special handling for version mismatch errors
      if (err.message && err.message.includes('version')) {
        const versionMatch = err.message.match(/version ([0-9.]+)/);
        if (versionMatch && versionMatch[1]) {
          const serverVersion = versionMatch[1];
          
          this.sendToClient(clientId, {
            type: 'error',
            message: `Version mismatch. Server is running ${serverVersion}. Attempting to reconnect with the correct version...`
          });
          
          // Try to reconnect with the detected version
          try {
            bot.end();
            
            // Create a new bot with the correct version
            setTimeout(() => {
              const newBot = mineflayer.createBot({
                host: activeBot.server,
                port: activeBot.port,
                username: activeBot.name,
                version: serverVersion,
                auth: 'offline',
                viewDistance: 'tiny',
                checkTimeoutInterval: 60 * 1000,
                logErrors: true
              });
              
              // Replace the old bot in the active bots map
              if (this.activeBots.has(botId)) {
                activeBot.bot = newBot;
                
                // Re-register all the event handlers
                this.setupBotEventHandlers(newBot, botId, clientId, activeBot);
              }
            }, 1000);
            
            return;
          } catch (reconnectError) {
            console.error('Error reconnecting with correct version:', reconnectError);
          }
        }
      }
      
      // Provide more user-friendly error messages
      let errorMessage = `Bot error: ${err.message}`;
      
      if (err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. The Minecraft server is not accepting connections. Please verify the server is running and the address is correct.';
      } else if (err.message.includes('ECONNRESET')) {
        errorMessage = 'Connection reset by server. The Minecraft server may be offline or has forcibly closed the connection.';
      } else if (err.message.includes('ETIMEDOUT')) {
        errorMessage = 'Connection timed out. The Minecraft server may be offline or behind a firewall.';
      } else if (err.message.includes('getaddrinfo')) {
        errorMessage = 'Could not resolve server address. Please check the server IP and try again.';
      }
      
      this.sendToClient(clientId, {
        type: 'error',
        message: errorMessage
      });
      
      this.disconnectBot(botId);
    });
  }
}

export const botManager = new MinecraftBotManager();
