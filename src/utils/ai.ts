import {FALLBACK_TIPS} from '../constants/plantAI';

export function getRandomFallback() {
  const index = Math.floor(Math.random() * FALLBACK_TIPS.length);
  return FALLBACK_TIPS[index];
}
