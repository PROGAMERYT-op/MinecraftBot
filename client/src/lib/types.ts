export interface ConnectionDetails {
  botName: string;
  botCount: number;
  serverIp: string;
}

export interface BotInfo {
  name: string;
  count: number;
  serverIp: string;
  health: number;
  food: number;
}

export interface ChatMessage {
  username: string;
  content: string;
  timestamp?: number;
}
