import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectionDetails } from "@/lib/types";

const connectionSchema = z.object({
  botName: z.string().min(3, "Bot name must be at least 3 characters"),
  botCount: z.coerce.number().int().min(1).max(10, "Maximum 10 bots allowed"),
  serverIp: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:[0-9]{1,5})?$/, "Enter a valid server address (e.g., play.example.com:25565)")
});

interface ConnectionFormProps {
  onSubmit: (data: ConnectionDetails) => void;
}

export default function ConnectionForm({ onSubmit }: ConnectionFormProps) {
  const form = useForm<z.infer<typeof connectionSchema>>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      botName: "",
      botCount: 1,
      serverIp: ""
    }
  });

  const handleSubmit = (values: z.infer<typeof connectionSchema>) => {
    onSubmit(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-['Minecraft'] text-[#4CAF50] mb-2">MineBotControl</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Control Minecraft bots remotely</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="botName"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Bot Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter bot name" 
                        {...field} 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="botCount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Number of Bots</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10} 
                        {...field} 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serverIp"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Server IP & Port</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="play.example.com:25565" 
                        {...field} 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full py-2 px-4 bg-[#4CAF50] hover:bg-[#43A047] text-white font-medium rounded-md shadow-md transition-colors relative"
              >
                Connect Bot
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
