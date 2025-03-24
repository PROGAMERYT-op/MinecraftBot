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
    
    try {
      const newSocket = new WebSocket(wsUrl);
      
      // Setup a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error('WebSocket connection timeout');
        if (newSocket.readyState === WebSocket.CONNECTING) {
          newSocket.close();
          setConnectionStatus('timeout');
          setIsConnecting(false);
          if (connectPromiseRef.current) {
            connectPromiseRef.current.reject(new Error('Connection timeout'));
            connectPromiseRef.current = null;
          }
        }
      }, 10000); // 10 seconds timeout

      newSocket.onopen = () => {
        console.log('WebSocket connected successfully');
        clearTimeout(connectionTimeout);
        setSocket(newSocket);
        setIsConnecting(false);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Setup ping interval to keep connection alive
        setupPingInterval(newSocket);
        
        if (connectPromiseRef.current) {
          connectPromiseRef.current.resolve(newSocket);
          connectPromiseRef.current = null;
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received websocket message:', data);
          
          // Handle ping/pong messages for connection keepalive
          if (data.type === 'pong') {
            // Server responded to our ping
            console.log('Received pong from server');
          } else if (data.type === 'ping') {
            // Server sent a ping, respond with pong
            newSocket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        clearTimeout(connectionTimeout);
        setConnectionStatus('error');
        setIsConnecting(false);
        
        if (connectPromiseRef.current) {
          connectPromiseRef.current.reject(error);
          connectPromiseRef.current = null;
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setSocket(null);
        setConnectionStatus('disconnected');
        
        // Clean up ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Auto-reconnect logic for abnormal closures (not if intentionally closed)
        if (event.code === 1006) { // Abnormal closure
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
            setConnectionStatus(`reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
            
            // Exponential backoff
            const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1);
            reconnectTimeoutRef.current = setTimeout(() => {
              createWebSocketConnection();
            }, delay);
          } else {
            console.error('Maximum reconnection attempts reached');
            setConnectionStatus('max_reconnect_attempts');
            if (connectPromiseRef.current) {
              connectPromiseRef.current.reject(new Error('Maximum reconnection attempts reached'));
              connectPromiseRef.current = null;
            }
          }
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setIsConnecting(false);
      setConnectionStatus('error');
      if (connectPromiseRef.current) {
        connectPromiseRef.current.reject(error);
        connectPromiseRef.current = null;
      }
    }
  }, [isConnecting, setupPingInterval]);

  const connect = useCallback(() => {
    return new Promise<WebSocket>((resolve, reject) => {
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
