export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
}

export interface ChatConfig {
  businessName: string;
  primaryColor: string;
  greeting: string;
  avatarUrl: string;
  previewUrl: string;
  systemPrompt?: string;  // This now contains ALL the data
}

export interface TranscriptionMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}