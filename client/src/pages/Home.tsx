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
    setConnectionStatus("Authenticating with Mojang servers...");
    
    try {
      await connect();
      
      // Steps to simulate connection process
      setTimeout(() => setConnectionStatus("Establishing connection to server..."), 1000);
      setTimeout(() => setConnectionStatus("Loading world data..."), 2000);
      setTimeout(() => setConnectionStatus("Spawning bot(s)..."), 3000);
      
      // Send connection details to server
      setTimeout(() => {
        if (socket) {
          socket.send(JSON.stringify({
            type: 'connect',
            data: details
          }));
          
          // Setup event handler for successful connection
          const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
              socket.removeEventListener('message', handleMessage);
              setLocation('/control');
            }
          };
          
          socket.addEventListener('message', handleMessage);
        }
      }, 4000);
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      setConnectionStatus("Connection failed. Please try again.");
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
