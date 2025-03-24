import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full bg-gray-200 dark:bg-gray-700 shadow-md"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}
