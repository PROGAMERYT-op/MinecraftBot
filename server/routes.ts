import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { connectionSchema, type WebSocketMessage } from "@shared/schema";
import { nanoid } from "nanoid";
import { botManager } from "./mineflayer";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create WebSocket server on a separate path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Set a ping interval to keep connections alive
    clientTracking: true
  });

  // Map to track active client connections and their bots
  const clients = new Map<string, { 
    socket: WebSocket, 
    clientId: string,
    botId?: string 
  }>();
  
  // Interval to ping clients and keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.ping();
        } catch (error) {
          console.error('Error pinging client:', error);
        }
      }
    });
  }, 30000); // Send a ping every 30 seconds
  
  // Clear ping interval on server close
  httpServer.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (socket, req) => {
    // Generate a unique client ID
    const clientId = nanoid();
    
    // Log the connection with IP info for debugging
    const ip = req.socket.remoteAddress || 'unknown';
    console.log(`New WebSocket client connected: ${clientId} from ${ip}`);
    
    // Send a welcome message to confirm the connection is working
    try {
      socket.send(JSON.stringify({
        type: 'info',
        message: 'WebSocket connection established'
      }));
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
    
    // Register client with bot manager
    botManager.registerClient(clientId, socket);
    
    // Store client information
    clients.set(clientId, { socket, clientId });
    
    // Setup ping handler
    socket.on('ping', () => {
      try {
        socket.pong();
      } catch (error) {
        console.error('Error sending pong:', error);
      }
    });

    socket.on('message', async (data) => {
      try {
        console.log('Received message:', data.toString());
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        const client = clients.get(clientId);
        
        if (!client) {
          console.error(`Client not found: ${clientId}`);
          return;
        }

        switch (message.type) {
          case 'connect': {
            // Validate connection details
            const validationResult = connectionSchema.safeParse(message.data);
            if (!validationResult.success) {
              console.error('Invalid connection details:', validationResult.error);
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Invalid connection details'
              }));
              return;
            }

            const { botName, botCount, serverIp } = message.data;
            console.log(`Attempting to create bot: ${botName} on server ${serverIp}`);
            
            try {
              // Create bot and connect to server
              // For now, we only support creating one bot at a time
              const botId = await botManager.createBot(botName, serverIp, clientId);
              client.botId = botId;
              
              console.log(`Bot created: ${botName} connecting to ${serverIp}`);
            } catch (error) {
              console.error('Error creating bot:', error);
              socket.send(JSON.stringify({
                type: 'error',
                message: `Failed to create bot: ${(error as Error).message}`
              }));
            }
            break;
          }
          
          case 'disconnect': {
            if (client.botId) {
              botManager.disconnectBot(client.botId);
              client.botId = undefined;
              
              socket.send(JSON.stringify({
                type: 'disconnected'
              }));
            }
            break;
          }
          
          case 'cancel': {
            if (client.botId) {
              botManager.disconnectBot(client.botId);
              client.botId = undefined;
            }
            break;
          }
          
          case 'getBotInfo': {
            if (client.botId) {
              const botInfo = botManager.getBotInfo(client.botId);
              if (botInfo) {
                socket.send(JSON.stringify({
                  type: 'botInfo',
                  data: botInfo
                }));
              }
            }
            break;
          }
          
          case 'control': {
            if (client.botId) {
              botManager.controlBot(client.botId, message.action);
            }
            break;
          }
          
          case 'chat': {
            if (client.botId) {
              botManager.sendChatMessage(client.botId, message.message);
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    socket.on('close', () => {
      // Get client info before removing
      const client = clients.get(clientId);
      
      // Clean up bots if any
      if (client?.botId) {
        botManager.disconnectBot(client.botId);
      }
      
      // Unregister client from bot manager
      botManager.unregisterClient(clientId);
      
      // Remove client from map
      clients.delete(clientId);
      
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  });

  // Clean up on server close
  httpServer.on('close', () => {
    console.log('Server closing, disconnecting all bots...');
    botManager.disconnectAllBots();
  });

  return httpServer;
}
