import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface WebSocketContextType {
  socket: WebSocket | null;
  connect: () => Promise<WebSocket>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connect: () => Promise.reject(new Error('WebSocketProvider not initialized')),
  disconnect: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  const connect = useCallback(() => {
    return new Promise<WebSocket>((resolve, reject) => {
      // Close existing connection if any
      if (socket) {
        socket.close();
      }

      try {
        // Create new WebSocket connection
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        
        const newSocket = new WebSocket(wsUrl);
        
        // Setup a connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('WebSocket connection timeout');
          newSocket.close();
          reject(new Error('Connection timeout'));
        }, 10000); // 10 seconds timeout

        newSocket.onopen = () => {
          console.log('WebSocket connected successfully');
          clearTimeout(connectionTimeout);
          setSocket(newSocket);
          resolve(newSocket);
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          clearTimeout(connectionTimeout);
          reject(error);
        };

        newSocket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          setSocket(null);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{ socket, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};
