import AsyncStorage from '@react-native-async-storage/async-storage';
import {ChatMessage} from '../types';

const STORAGE_KEY = 'ai_chat_history';
const LIMIT_KEY = 'ai_chat_history_limit';
const DEFAULT_HISTORY_LIMIT = 5;
const HARD_CAP = 200;

type StoredMessage = Omit<ChatMessage, 'timestamp'> & {timestamp: string};

export async function loadChatHistory(limit?: number): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: StoredMessage[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const cleaned = parsed
      .map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
      .filter(msg => msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime()));
    return trimHistory(cleaned, limit);
  } catch (error) {
    console.warn('Failed to load chat history', error);
    return [];
  }
}

export async function persistChatHistory(
  messages: ChatMessage[],
  limit?: number,
): Promise<void> {
  try {
    const trimmed = trimHistory(messages, limit);
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

export function trimHistory(messages: ChatMessage[], limit?: number): ChatMessage[] {
  const max = resolveLimit(limit);
  if (messages.length <= max) {
    return messages;
  }
  return messages.slice(-max);
}

export async function loadHistoryLimit(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LIMIT_KEY);
    if (!raw) {
      return DEFAULT_HISTORY_LIMIT;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
    return DEFAULT_HISTORY_LIMIT;
  } catch (error) {
    console.warn('Failed to load history limit', error);
    return DEFAULT_HISTORY_LIMIT;
  }
}

export async function saveHistoryLimit(limit: number): Promise<void> {
  try {
    const resolved = resolveLimit(limit);
    await AsyncStorage.setItem(LIMIT_KEY, `${limit}`);
    // Trim stored history to respect new limit
    const existing = await loadChatHistory(resolved);
    await persistChatHistory(existing, resolved);
  } catch (error) {
    console.warn('Failed to save history limit', error);
  }
}

function resolveLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_HISTORY_LIMIT;
  }
  if (limit <= 0) {
    return HARD_CAP;
  }
  return Math.min(limit, HARD_CAP);
}
