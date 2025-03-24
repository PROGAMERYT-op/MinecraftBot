import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  botName: string;
}

export default function ChatPanel({ messages, onSendMessage, botName }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex-1">
      <CardContent className="p-4 flex flex-col h-full">
        <h2 className="text-lg font-medium mb-2">Server Chat</h2>
        
        <div 
          ref={chatHistoryRef}
          className="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1)'
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
                  : {msg.content}
                </div>
              ))
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex">
          <Input 
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
