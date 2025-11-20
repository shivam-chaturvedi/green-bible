import {ChatMessage} from '../types';

export function formatTemp(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return `${value.toFixed(1)}°C`;
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return `${Math.round(value)}%`;
}

export function formatPrecip(value: number) {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return `${value.toFixed(1)} mm`;
}

export function placeholder(unit: string) {
  return `-- ${unit}`;
}

export function capitalize(text: string) {
  if (!text) {
    return '';
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatShortTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function createMessage(role: 'user' | 'bot', text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    timestamp: new Date(),
  };
}
