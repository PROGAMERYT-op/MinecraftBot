import { BotInfo } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

interface BotControlsProps {
  botInfo: BotInfo;
  onMove: (direction: string) => void;
  onAction: (action: string) => void;
}

export default function BotControls({ botInfo, onMove, onAction }: BotControlsProps) {
  return (
    <>
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
        <CardContent className="p-4">
          <h2 className="text-lg font-medium mb-2">Bot Information</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Bot Name:</p>
              <p className="font-medium">{botInfo.name}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Number of Bots:</p>
              <p className="font-medium">{botInfo.count}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Bot Health:</p>
              <Progress value={botInfo.health} className="h-2.5 mt-1 bg-gray-300 dark:bg-gray-600">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${botInfo.health}%` }}></div>
              </Progress>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Food Level:</p>
              <Progress value={botInfo.food} className="h-2.5 mt-1 bg-gray-300 dark:bg-gray-600">
                <div className="h-full bg-[#FF9800] rounded-full" style={{ width: `${botInfo.food}%` }}></div>
              </Progress>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex-1">
        <CardContent className="p-4 flex flex-col h-full">
          <h2 className="text-lg font-medium mb-4">Bot Controls</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Control pad */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div></div>
              <button 
                className="h-14 w-14 rounded-md flex items-center justify-center shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                onMouseDown={() => onMove('forward')}
                onMouseUp={() => onMove('stop')}
                onTouchStart={() => onMove('forward')}
                onTouchEnd={() => onMove('stop')}
              >
                <ArrowUp className="h-6 w-6" />
              </button>
              <div></div>
              
              <button 
                className="h-14 w-14 rounded-md flex items-center justify-center shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                onMouseDown={() => onMove('left')}
                onMouseUp={() => onMove('stop')}
                onTouchStart={() => onMove('left')}
                onTouchEnd={() => onMove('stop')}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <button 
                className="h-14 w-14 rounded-md flex items-center justify-center shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                onMouseDown={() => onMove('backward')}
                onMouseUp={() => onMove('stop')}
                onTouchStart={() => onMove('backward')}
                onTouchEnd={() => onMove('stop')}
              >
                <ArrowDown className="h-6 w-6" />
              </button>
              <button 
                className="h-14 w-14 rounded-md flex items-center justify-center shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                onMouseDown={() => onMove('right')}
                onMouseUp={() => onMove('stop')}
                onTouchStart={() => onMove('right')}
                onTouchEnd={() => onMove('stop')}
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
            
            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button 
                className="py-2 px-4 rounded-md shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
                onClick={() => onAction('jump')}
              >
                Jump
              </button>
              <button 
                className="py-2 px-4 rounded-md shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
                onClick={() => onAction('attack')}
              >
                Attack
              </button>
              <button 
                className="py-2 px-4 rounded-md shadow-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
                onClick={() => onAction('use')}
              >
                Use Item
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
            Keyboard shortcuts: Arrow keys for movement, Space for jump
          </div>
        </CardContent>
      </Card>
    </>
  );
}
