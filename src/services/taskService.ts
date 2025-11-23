import AsyncStorage from '@react-native-async-storage/async-storage';
import {Task} from '../types';

const PREFS_NAME = 'calendar_tasks';
const KEY_TASKS = 'tasks_json';

type TasksListener = () => void;
const listeners = new Set<TasksListener>();

function notifyTasksChanged() {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.warn('tasks listener failed', error);
    }
  });
}

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
    notifyTasksChanged();
  } catch (error) {
    console.warn('Failed to save tasks', error);
  }
}

export async function saveTasksOrThrow(tasks: Task[]): Promise<void> {
  const payload = JSON.stringify(tasks);
  await AsyncStorage.setItem(`${PREFS_NAME}:${KEY_TASKS}`, payload);
  notifyTasksChanged();
}

export async function addTask(text: string, dateTime: Date): Promise<Task> {
  const storedTasks = await loadTasks();
  const task: Task = {
    id: randomId(),
    text,
    date: formatDateKey(dateTime),
    time: formatTimeValue(dateTime),
    updated: new Date().toISOString(),
  };
  await saveTasksOrThrow([...storedTasks, task]);
  return task;
}

function randomId() {
  return `task-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeValue(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addTasksListener(listener: TasksListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
