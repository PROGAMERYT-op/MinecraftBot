import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ConnectionForm from "@/components/ConnectionForm";
import LoadingScreen from "@/components/LoadingScreen";
import ThemeToggle from "@/components/ThemeToggle";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionDetails } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [showConnectionScreen, setShowConnectionScreen] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [localConnectionStatus, setLocalConnectionStatus] = useState("");
  const { socket, connect, disconnect, connectionStatus, isConnecting } = useWebSocket();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Display user-friendly connection status
  useEffect(() => {
    if (connectionStatus === 'connecting') {
      setLocalConnectionStatus("Establishing WebSocket connection...");
    } else if (connectionStatus === 'connected') {
      setLocalConnectionStatus("Connected to WebSocket. Connecting to Minecraft server...");
    } else if (connectionStatus === 'disconnected') {
      if (showConnectionScreen) {
        setLocalConnectionStatus("Disconnected from server");
      }
    } else if (connectionStatus === 'error') {
      setLocalConnectionStatus("Connection error. Please try again.");
    } else if (connectionStatus === 'timeout') {
      setLocalConnectionStatus("Connection timed out. Please try again.");
    } else if (connectionStatus.includes('reconnecting')) {
      setLocalConnectionStatus(`Lost connection. ${connectionStatus}...`);
    } else if (connectionStatus === 'max_reconnect_attempts') {
      setLocalConnectionStatus("Failed to reconnect after multiple attempts. Please try again.");
      // Automatically hide connection screen after max attempts
      setTimeout(() => setShowConnectionScreen(false), 3000);
    }
  }, [connectionStatus, showConnectionScreen]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received websocket message:", data);
        
        if (data.type === 'info') {
          // Informational messages
          setLocalConnectionStatus(data.message);
        } else if (data.type === 'connected') {
          // Successfully connected to Minecraft server, navigate to control panel
          setLocation('/control');
        } else if (data.type === 'error') {
          // Handle connection error
          console.error("Connection error:", data.message);
          setLocalConnectionStatus(`Error: ${data.message}`);
          toast({
            title: "Connection Error",
            description: data.message,
            variant: "destructive"
          });
          
          if (data.message.includes("version mismatch") || data.message.includes("trying to reconnect")) {
            // For version mismatch, wait for auto-reconnection
            setLocalConnectionStatus("Server version mismatch. Attempting to reconnect with correct version...");
          } else {
            // For other errors, reset connection screen after delay
            setTimeout(() => setShowConnectionScreen(false), 3000);
          }
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };
    
    // Add message event listener
    socket.addEventListener('message', handleMessage);
    
    // Cleanup function
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, setLocation, toast]);

  const handleConnection = async (details: ConnectionDetails) => {
    setConnectionDetails(details);
    setShowConnectionScreen(true);
    setLocalConnectionStatus("Establishing WebSocket connection...");
    
    try {
      const webSocket = await connect();
      
      // Send connection details to server
      webSocket.send(JSON.stringify({
        type: 'connect',
        data: details
      }));
      
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      setLocalConnectionStatus("Failed to establish WebSocket connection. Please try again.");
      toast({
        title: "Connection Failed",
        description: "Could not establish WebSocket connection",
        variant: "destructive"
      });
      setTimeout(() => setShowConnectionScreen(false), 3000);
    }
  };

  const cancelConnection = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'cancel'
        }));
      } catch (error) {
        console.error("Error sending cancel message:", error);
      }
    }
    
    // Disconnect the WebSocket
    disconnect();
    setShowConnectionScreen(false);
  };

  return (
    <div className="font-mono bg-slate-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 transition-colors duration-200 min-h-screen">
      <ThemeToggle />

      {showConnectionScreen ? (
        <LoadingScreen 
          connectionDetails={connectionDetails!}
          connectionStatus={localConnectionStatus || "Connecting..."}
          onCancel={cancelConnection}
        />
      ) : (
        <ConnectionForm onSubmit={handleConnection} />
      )}
    </div>
  );
}
