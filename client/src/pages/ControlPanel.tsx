import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import BotControls from "@/components/BotControls";
import ChatPanel from "@/components/ChatPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { BotInfo, ChatMessage } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function ControlPanel() {
  const [, setLocation] = useLocation();
  const { socket } = useWebSocket();
  const { toast } = useToast();
  const [botInfo, setBotInfo] = useState<BotInfo>({
    name: "Unknown",
    count: 1,
    serverIp: "Unknown",
    health: 0,
    food: 0
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<'controls' | 'chat'>('controls');
  
  // Initialize keyboard controls
  const { handleKeyDown, handleKeyUp } = useKeyboardControls((action) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'control', action }));
    }
  });

  useEffect(() => {
    // Check if socket exists and is connected
    if (!socket) {
      toast({
        title: "Connection Error",
        description: "Not connected to server. Redirecting to home.",
        variant: "destructive"
      });
      setTimeout(() => setLocation('/'), 2000);
      return;
    }

    // Setup message handler
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'botInfo':
            setBotInfo(data.data);
            break;
          case 'chat':
            setChatMessages(prev => [...prev, data.message]);
            break;
          case 'error':
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive"
            });
            break;
          case 'disconnected':
            toast({
              title: "Disconnected",
              description: "Bot has been disconnected from the server."
            });
            setLocation('/');
            break;
        }
      } catch (error) {
        console.error("Error parsing websocket message:", error);
      }
    };

    socket.addEventListener('message', handleMessage);
    
    // Setup event listeners for keyboard controls
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Request bot information once connected
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'getBotInfo' }));
    }

    // Cleanup function
    return () => {
      socket.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, setLocation, toast, handleKeyDown, handleKeyUp]);

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect?')) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'disconnect' }));
      }
      setLocation('/');
    }
  };

  const sendChatMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat',
        message
      }));
    }
  };

  const handleMoveControl = (direction: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'control',
        action: direction
      }));
    }
  };

  const handleAction = (action: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'control',
        action
      }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-slate-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 transition-colors duration-200">
      <ThemeToggle />
      
      {/* Header with server info */}
      <header className="bg-mcgreen-600 text-white py-3 px-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="font-['Minecraft'] text-lg">MineBotControl</h1>
          <div className="text-xs opacity-90 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-green-300 mr-1"></span>
            Connected to: {botInfo.serverIp}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="text-xs bg-red-500 hover:bg-red-600 py-1 px-3 rounded shadow-sm text-white"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
          <button 
            className="md:hidden p-1"
            onClick={() => setActiveMobileTab(activeMobileTab === 'controls' ? 'chat' : 'controls')}
          >
            <span className="material-icons">{activeMobileTab === 'controls' ? 'chat' : 'gamepad'}</span>
          </button>
        </div>
      </header>
      
      {/* Tab navigation for mobile */}
      <div className="md:hidden bg-gray-200 dark:bg-gray-800 flex">
        <button 
          className={`flex-1 py-2 px-4 font-medium text-center border-b-2 ${
            activeMobileTab === 'controls' 
              ? 'border-mcgreen-500 text-mcgreen-500' 
              : 'border-transparent'
          }`}
          onClick={() => setActiveMobileTab('controls')}
        >
          Controls
        </button>
        <button 
          className={`flex-1 py-2 px-4 font-medium text-center border-b-2 ${
            activeMobileTab === 'chat' 
              ? 'border-mcgreen-500 text-mcgreen-500' 
              : 'border-transparent'
          }`}
          onClick={() => setActiveMobileTab('chat')}
        >
          Chat
        </button>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Bot controls */}
        <div className={`w-full md:w-1/2 p-4 flex flex-col ${
          activeMobileTab === 'controls' || window.innerWidth >= 768 ? 'block' : 'hidden md:flex'
        }`}>
          <BotControls 
            botInfo={botInfo} 
            onMove={handleMoveControl}
            onAction={handleAction}
          />
        </div>
        
        {/* Right panel: Chat */}
        <div className={`w-full md:w-1/2 p-4 flex flex-col ${
          activeMobileTab === 'chat' || window.innerWidth >= 768 ? 'block md:flex' : 'hidden'
        }`}>
          <ChatPanel 
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            botName={botInfo.name}
          />
        </div>
      </div>
    </div>
  );
}
