import { ConnectionDetails } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

interface LoadingScreenProps {
  connectionDetails: ConnectionDetails;
  connectionStatus: string;
  onCancel: () => void;
}

export default function LoadingScreen({ 
  connectionDetails, 
  connectionStatus, 
  onCancel 
}: LoadingScreenProps) {
  // Determine if there's an error state
  const isError = connectionStatus.toLowerCase().includes('error') || 
                 connectionStatus.toLowerCase().includes('failed') ||
                 connectionStatus.toLowerCase().includes('timeout');
  
  // Determine if we're in a reconnection state
  const isReconnecting = connectionStatus.toLowerCase().includes('reconnect');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h2 className={`text-xl font-['Minecraft'] mb-4 ${
          isError ? 'text-red-500' : 
          isReconnecting ? 'text-amber-500' : 
          'text-[#4CAF50]'
        }`}>
          {isError ? "Connection Error" : 
           isReconnecting ? "Reconnecting..." : 
           "Connecting to Server"}
        </h2>
        
        {isError ? (
          <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-4" />
        ) : (
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${isReconnecting ? 'bg-amber-500' : 'bg-[#4CAF50]'} animate-pulse`} style={{ animationDelay: '0s' }}></div>
            <div className={`w-3 h-3 rounded-full ${isReconnecting ? 'bg-amber-500' : 'bg-[#4CAF50]'} animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
            <div className={`w-3 h-3 rounded-full ${isReconnecting ? 'bg-amber-500' : 'bg-[#4CAF50]'} animate-pulse`} style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isError ? "Failed to connect to " : 
           isReconnecting ? "Attempting to reconnect to " : 
           "Establishing connection to "}
          <span>{connectionDetails.serverIp}</span>
        </p>
      </div>
      
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2">Connection Details</h3>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <li>• Bot Name: <span>{connectionDetails.botName}</span></li>
            <li>• Bots Count: <span>{connectionDetails.botCount}</span></li>
            <li>• Status: <span className={`${
              isError ? 'text-red-500 font-medium' : 
              isReconnecting ? 'text-amber-500 font-medium' : 
              ''
            }`}>{connectionStatus}</span></li>
          </ul>
        </CardContent>
      </Card>
      
      <Button 
        className={`mt-6 py-2 px-4 ${
          isError ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
        } text-white font-medium rounded-md shadow-md`}
        onClick={onCancel}
      >
        {isError ? "Back to Home" : "Cancel Connection"}
      </Button>
    </div>
  );
}
