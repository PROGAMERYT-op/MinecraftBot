import { useState } from "react";
import { useLocation } from "wouter";
import ConnectionForm from "@/components/ConnectionForm";
import LoadingScreen from "@/components/LoadingScreen";
import ThemeToggle from "@/components/ThemeToggle";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionDetails } from "@/lib/types";

export default function Home() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Initializing connection...");
  const { socket, connect } = useWebSocket();
  const [, setLocation] = useLocation();

  const handleConnection = async (details: ConnectionDetails) => {
    setConnectionDetails(details);
    setIsConnecting(true);
    setConnectionStatus("Establishing WebSocket connection...");
    
    try {
      const webSocket = await connect();
      
      // Setup connection status updates
      setConnectionStatus("Connecting to Minecraft server...");
      
      // Setup event handler for messages
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received websocket message:", data);
          
          if (data.type === 'connected') {
            // Successfully connected, navigate to control panel
            webSocket.removeEventListener('message', handleMessage);
            setLocation('/control');
          } else if (data.type === 'error') {
            // Handle connection error
            console.error("Connection error:", data.message);
            setConnectionStatus(`Error: ${data.message}`);
            setTimeout(() => setIsConnecting(false), 3000);
            webSocket.removeEventListener('message', handleMessage);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };
      
      // Add message event listener
      webSocket.addEventListener('message', handleMessage);
      
      // Send connection details to server
      webSocket.send(JSON.stringify({
        type: 'connect',
        data: details
      }));
      
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      setConnectionStatus("WebSocket connection failed. Please try again.");
      setTimeout(() => setIsConnecting(false), 2000);
    }
  };

  const cancelConnection = () => {
    if (socket) {
      socket.send(JSON.stringify({
        type: 'cancel'
      }));
    }
    setIsConnecting(false);
  };

  return (
    <div className="font-mono bg-slate-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 transition-colors duration-200 min-h-screen">
      <ThemeToggle />

      {isConnecting ? (
        <LoadingScreen 
          connectionDetails={connectionDetails!}
          connectionStatus={connectionStatus}
          onCancel={cancelConnection}
        />
      ) : (
        <ConnectionForm onSubmit={handleConnection} />
      )}
    </div>
  );
}
