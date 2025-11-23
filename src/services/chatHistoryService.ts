import AsyncStorage from '@react-native-async-storage/async-storage';
import {ChatMessage} from '../types';

const STORAGE_KEY = 'ai_chat_history';
const MAX_MESSAGES = 45;
const RECENT_MINIMUM = 5;

type StoredMessage = Omit<ChatMessage, 'timestamp'> & {timestamp: string};

export async function loadChatHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: StoredMessage[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
      .filter(msg => msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime()));
  } catch (error) {
    console.warn('Failed to load chat history', error);
    return [];
  }
}

export async function persistChatHistory(messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = trimHistory(messages);
    const serialized: StoredMessage[] = trimmed.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : new Date().toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.warn('Failed to save chat history', error);
  }
}

export async function appendChatMessage(message: ChatMessage): Promise<void> {
  const existing = await loadChatHistory();
  const merged = trimHistory([...existing, message]);
  await persistChatHistory(merged);
}

export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  return messages.slice(-Math.max(MAX_MESSAGES, RECENT_MINIMUM));
}
