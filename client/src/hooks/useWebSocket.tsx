import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

interface WebSocketContextType {
  socket: WebSocket | null;
  connect: () => Promise<WebSocket>;
  disconnect: () => void;
  isConnecting: boolean;
  connectionStatus: string;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connect: () => Promise.reject(new Error('WebSocketProvider not initialized')),
  disconnect: () => {},
  isConnecting: false,
  connectionStatus: 'disconnected'
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const connectPromiseRef = useRef<{ resolve: (socket: WebSocket) => void, reject: (error: any) => void } | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000; // 3 seconds
  const PING_INTERVAL = 30000; // 30 seconds

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [socket]);

  // Handle sending pings to keep the connection alive
  const setupPingInterval = useCallback((ws: WebSocket) => {
    // Clear any existing interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Set up a new ping interval
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send a ping message to keep the connection alive
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, PING_INTERVAL);
  }, []);

  // Function to create a WebSocket connection
  const createWebSocketConnection = useCallback(() => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    // Create new WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    // Declare outside try-catch so we can access in all handlers
    let newSocket: WebSocket | null = null;
    let connectionTimeout: NodeJS.Timeout | null = null;
    
    // Function to clean up resources
    const cleanUp = () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
    
    try {
      newSocket = new WebSocket(wsUrl);
      
      // Setup a connection timeout
      connectionTimeout = setTimeout(() => {
        console.error('WebSocket connection timeout');
        if (newSocket && newSocket.readyState === WebSocket.CONNECTING) {
          newSocket.close();
          setConnectionStatus('timeout');
          setIsConnecting(false);
          if (connectPromiseRef.current) {
            connectPromiseRef.current.reject(new Error('Connection timeout'));
            connectPromiseRef.current = null;
          }
        }
        connectionTimeout = null;
      }, 10000); // 10 seconds timeout

      newSocket.onopen = () => {
        console.log('WebSocket connected successfully');
        cleanUp(); // Clear timeout
        setSocket(newSocket);
        setIsConnecting(false);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Setup ping interval to keep connection alive
        if (newSocket) {
          setupPingInterval(newSocket);
        }
        
        if (connectPromiseRef.current) {
          connectPromiseRef.current.resolve(newSocket!);
          connectPromiseRef.current = null;
        }
      };

      newSocket.onmessage = (event) => {
        try {
          // Check if the socket has been garbage collected or is no longer valid
          if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
            console.warn('Received message on invalid socket');
            return;
          }
          
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError);
            return;
          }
          
          console.log('Received websocket message:', data);
          
          // Handle ping/pong messages for connection keepalive
          if (data.type === 'pong') {
            // Server responded to our ping
            console.log('Received pong from server');
          } else if (data.type === 'ping') {
            // Server sent a ping, respond with pong
            try {
              newSocket.send(JSON.stringify({ type: 'pong' }));
            } catch (sendError) {
              console.error('Error sending pong response:', sendError);
            }
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        cleanUp(); // Clear timeout and intervals
        setConnectionStatus('error');
        setIsConnecting(false);
        
        if (connectPromiseRef.current) {
          connectPromiseRef.current.reject(error);
          connectPromiseRef.current = null;
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        cleanUp(); // Clear timeout and intervals
        setSocket(null);
        setConnectionStatus('disconnected');
        
        // Resolve or reject any pending promises to prevent unhandled rejections
        if (connectPromiseRef.current) {
          connectPromiseRef.current.reject(new Error(`WebSocket closed with code ${event.code}`));
          connectPromiseRef.current = null;
        }
        
        // Auto-reconnect logic for abnormal closures (not if intentionally closed)
        const isAbnormalClosure = event.code === 1006 || event.code === 1012 || event.code === 1013;
        const isServerError = event.code === 1011;
        const shouldReconnect = isAbnormalClosure || isServerError;
        
        if (shouldReconnect) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
            setConnectionStatus(`reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
            
            // Exponential backoff with a bit of randomness to prevent thundering herd
            const baseDelay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1);
            const jitter = Math.random() * 1000; // Add up to 1 second of jitter
            const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
            
            try {
              // Use a wrapped timeout to catch any errors in the callback
              reconnectTimeoutRef.current = setTimeout(() => {
                try {
                  createWebSocketConnection();
                } catch (reconnectError) {
                  console.error('Error during reconnection attempt:', reconnectError);
                  setConnectionStatus('error');
                  setIsConnecting(false);
                }
              }, delay);
            } catch (timeoutError) {
              console.error('Error setting reconnect timeout:', timeoutError);
              setConnectionStatus('error');
              setIsConnecting(false);
            }
          } else {
            console.error('Maximum reconnection attempts reached');
            setConnectionStatus('max_reconnect_attempts');
          }
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      cleanUp(); // Ensure we clean up resources
      setIsConnecting(false);
      setConnectionStatus('error');
      if (connectPromiseRef.current) {
        connectPromiseRef.current.reject(error);
        connectPromiseRef.current = null;
      }
    }
    
    // Return a cleanup function to properly handle component unmount during connection
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      if (newSocket && (newSocket.readyState === WebSocket.CONNECTING || newSocket.readyState === WebSocket.OPEN)) {
        try {
          newSocket.close(1000, 'Component unmounted');
        } catch (error) {
          console.error('Error closing socket during cleanup:', error);
        }
      }
    };
  }, [isConnecting, setupPingInterval]);

  const connect = useCallback(() => {
    return new Promise<WebSocket>((resolve, reject) => {
      try {
        // Close existing connection if any
        if (socket) {
          socket.close();
        }
        
        // Stop any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Reset reconnect attempts
        reconnectAttemptsRef.current = 0;
        
        // Store the promise callbacks
        connectPromiseRef.current = { resolve, reject };
        
        // Create a new connection
        createWebSocketConnection();
      } catch (error) {
        console.error('Error in connect method:', error);
        reject(error);
        connectPromiseRef.current = null;
      }
    }).catch(error => {
      // Add global catch to ensure no unhandled rejections
      console.error('Unhandled WebSocket connection error:', error);
      throw error; // Re-throw so caller can handle if needed
    });
  }, [socket, createWebSocketConnection]);

  const disconnect = useCallback(() => {
    // Stop any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (socket) {
      // Use a clean close code (1000) to prevent auto-reconnect
      socket.close(1000, 'Disconnected by user');
      setSocket(null);
      setConnectionStatus('disconnected');
    }
    
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      connect, 
      disconnect, 
      isConnecting, 
      connectionStatus 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
