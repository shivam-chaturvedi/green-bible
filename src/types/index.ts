export type ChipId = 'all' | 'composting' | 'organic' | 'water' | 'tips';
export type AppTab = 'home' | 'health' | 'calendar' | 'sustain' | 'ai' | 'about';

export type GuideCardContent = {
  id: string;
  title: string;
  body: string;
  icon: string;
};

export type WeatherSnapshot = {
  locationName: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  summary: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
};

export type ChipFilter = {
  id: ChipId;
  label: string;
  icon: string;
};

export type BottomNavItem = {
  id: string;
  label: string;
  icon: string;
};

export type Task = {
  id: string;
  text: string;
  date: string; // yyyy-MM-dd
  time?: string;
  updated?: string;
};
