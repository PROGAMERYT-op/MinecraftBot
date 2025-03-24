import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Clock } from "lucide-react";
import { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  botName: string;
}

export default function ChatPanel({ messages, onSendMessage, botName }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // Format timestamps for chat messages
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      console.log('Sending chat message:', inputValue.trim());
      onSendMessage(inputValue.trim());
      setInputValue("");
      
      // Focus the input field after sending
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex-1">
      <CardContent className="p-4 flex flex-col h-full">
        <h2 className="text-lg font-medium mb-2">Server Chat</h2>
        
        <div 
          ref={chatHistoryRef}
          className="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar chat-messages"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1)',
            maxHeight: 'calc(70vh - 100px)'
          }}
        >
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="px-3 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                No messages yet. Chat messages will appear here.
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <span 
                      className={`font-medium ${
                        msg.username === botName 
                          ? 'text-[#4CAF50]' 
                          : msg.username === 'SERVER' 
                            ? 'text-[#4CAF50]' 
                            : 'text-blue-500'
                      }`}
                    >
                      {msg.username === botName ? `[${msg.username}]` : msg.username}
                    </span>
                    {msg.timestamp && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 mt-0.5 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex">
          <Input 
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 focus:outline-none"
          />
          <Button 
            type="submit" 
            className="px-4 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-r-md transition-colors"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
