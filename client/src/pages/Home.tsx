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
      // First check if the server URL looks valid
      const serverParts = details.serverIp.split(':');
      if (serverParts.length > 1) {
        const port = parseInt(serverParts[1], 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error("Invalid server port. Port must be between 1 and 65535.");
        }
      }
      
      // Try to connect to the WebSocket server
      const webSocket = await connect();
      
      try {
        // Send connection details to server
        webSocket.send(JSON.stringify({
          type: 'connect',
          data: details
        }));
        
        // Set a timeout to check if we get a response from the server
        const connectionResponseTimeout = setTimeout(() => {
          if (showConnectionScreen) {
            setLocalConnectionStatus("Server is taking longer than expected to respond. This may indicate the Minecraft server is offline or starting up.");
          }
        }, 10000); // 10 seconds
        
        // Clean up timeout if component unmounts
        return () => clearTimeout(connectionResponseTimeout);
        
      } catch (sendError) {
        console.error("Error sending connection details:", sendError);
        toast({
          title: "Connection Error",
          description: "Connected to WebSocket server but failed to send connection details",
          variant: "destructive"
        });
        throw new Error("Failed to send connection details to server");
      }
      
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setLocalConnectionStatus(`Connection error: ${errorMessage}`);
      
      // Provide more user-friendly error messages
      let userMessage = "Could not establish connection";
      
      if (errorMessage.includes("timeout")) {
        userMessage = "Connection timed out. The server might be unavailable.";
      } else if (errorMessage.includes("port")) {
        userMessage = "Invalid server address or port number. Please check and try again.";
      } else if (errorMessage.includes("Failed to send")) {
        userMessage = "Connection established but failed to communicate with server.";
      }
      
      toast({
        title: "Connection Failed",
        description: userMessage,
        variant: "destructive"
      });
      
      // Return to form after a delay
      setTimeout(() => {
        if (showConnectionScreen) {
          setShowConnectionScreen(false);
        }
      }, 5000);
    }
  };

  const cancelConnection = () => {
    // First update the UI state
    setLocalConnectionStatus("Cancelling connection...");
    
    // Try to send a cancel message if the socket is available
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'cancel'
        }));
      } catch (error) {
        console.error("Error sending cancel message:", error);
        toast({
          title: "Warning",
          description: "Could not send cancel message to server, but connection will be closed locally",
          variant: "destructive" // Using destructive instead of warning which isn't a valid variant
        });
      }
    }
    
    // Disconnect the WebSocket regardless of whether the message was sent
    try {
      disconnect();
    } catch (error) {
      console.error("Error disconnecting WebSocket:", error);
    } finally {
      // Always update UI state
      setShowConnectionScreen(false);
    }
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
