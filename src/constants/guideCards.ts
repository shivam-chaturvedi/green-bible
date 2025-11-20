import {GuideCardContent, ChipId} from '../types';

export const guideCards: GuideCardContent[] = [
  {
    id: 'composting',
    title: 'Composting Basics',
    body: 'Start with kitchen scraps, yard waste, and paper. Layer brown and green materials. Turn weekly and keep moist.',
    icon: '🌱',
  },
  {
    id: 'organic',
    title: 'Organic Weed Control',
    body: 'Use vinegar, salt, and dish soap mixture. Apply on sunny days for natural weed control.',
    icon: '🐛',
  },
  {
    id: 'water',
    title: 'Drip Irrigation',
    body: 'Install drip systems to deliver water directly to plant roots. Reduces evaporation and prevents fungal diseases.',
    icon: '💧',
  },
  {
    id: 'mulching',
    title: 'Mulching',
    body: 'Apply 2–3 inches of organic mulch to retain moisture, suppress weeds, and improve soil health.',
    icon: '🪵',
  },
  {
    id: 'rainwater',
    title: 'Rainwater Harvesting',
    body: 'Collect rainwater in barrels for garden use. Helps reduce municipal water consumption.',
    icon: '☔️',
  },
];

export const guideVisibilityMap: Record<ChipId, string[]> = {
  all: guideCards.map(card => card.id),
  composting: ['composting'],
  organic: ['organic'],
  water: ['water', 'mulching', 'rainwater'],
  tips: ['mulching', 'rainwater'],
};
