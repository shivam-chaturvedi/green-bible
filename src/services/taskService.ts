import AsyncStorage from '@react-native-async-storage/async-storage';
import {Task} from '../types';

const PREFS_NAME = 'calendar_tasks';
const KEY_TASKS = 'tasks_json';

export async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFS_NAME}:${KEY_TASKS}`);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(item => ({
        id: typeof item?.id === 'string' && item.id.length ? item.id : randomId(),
        text: typeof item?.text === 'string' ? item.text : '',
        date: typeof item?.date === 'string' ? item.date : '',
        time: typeof item?.time === 'string' ? item.time : undefined,
        updated: typeof item?.updated === 'string' ? item.updated : undefined,
      }))
      .filter(task => Boolean(task.date));
  } catch (error) {
    console.warn('Failed to load tasks', error);
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    const payload = JSON.stringify(tasks);
    await AsyncStorage.setItem(`${PREFS_NAME}:${KEY_TASKS}`, payload);
  } catch (error) {
    console.warn('Failed to save tasks', error);
  }
}

function randomId() {
  return `task-${Math.random().toString(36).slice(2, 10)}`;
}
