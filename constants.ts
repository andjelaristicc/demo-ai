import { ChatConfig, Message } from '@/types';

export const DEFAULT_CONFIG: ChatConfig = {
  businessName: 'Cosmetix AI',
  primaryColor: '#ec4899',
  greeting: 'Welcome! ✨ How can I help you today?',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant',
  previewUrl: 'https://www.wikipedia.org',
  systemPrompt: 'You are a helpful AI assistant. Answer questions professionally and courteously.'
};

export const SUGGESTED_QUESTIONS = [
  "What services do you offer?",
  "How can I contact you?",
  "What are your hours?",
  "Tell me about your products"
];