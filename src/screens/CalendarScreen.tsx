import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {BottomNavigation} from '../components/BottomNavigation';
import {colors} from '../theme/colors';
import {AppTab, Task} from '../types';
import {loadTasks, saveTasks} from '../services/taskService';
import {NotificationBanner} from '../components/NotificationBanner';

type Props = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
};

type EditingState =
  | {
      id: string;
      task: Task;
    }
  | null;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen({activeTab, onNavigate}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [modalVisible, setModalVisible] = useState(false);
  const [formText, setFormText] = useState('');
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTime, setFormTime] = useState<Date>(roundToNextHour(new Date()));
  const [editingState, setEditingState] = useState<EditingState>(null);
  const [iosPickerMode, setIosPickerMode] = useState<'date' | 'time' | null>(null);
  const [deadlineNotice, setDeadlineNotice] = useState<string | null>(null);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    const stored = await loadTasks();
    const sorted = [...stored].sort((a, b) =>
      compareTaskDateTime(a.date, a.time, b.date, b.time),
    );
    setTasks(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const dateKey = useCallback((date: Date) => formatDateKey(date), []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      const list = map.get(task.date) ?? [];
      list.push(task);
      map.set(task.date, list);
    });
    Array.from(map.values()).forEach(list =>
      list.sort((a, b) => compareTaskDateTime(a.date, a.time, b.date, b.time)),
    );
    return map;
  }, [tasks]);

  const tasksForSelectedDate = useMemo(() => {
    const key = dateKey(selectedDate);
    return tasksByDate.get(key) ?? [];
  }, [selectedDate, tasksByDate, dateKey]);

  useEffect(() => {
    const now = new Date();
    const overdue = tasksForSelectedDate.find(task => {
      if (!task.time) {
        return false;
      }
      const due = parseDateTime(task.date, task.time);
      return due.getTime() <= now.getTime() && !notifiedTasksRef.current.has(task.id);
    });
    if (overdue) {
      notifiedTasksRef.current.add(overdue.id);
      setDeadlineNotice(`Task "${overdue.text}" deadline reached. Time to take action!`);
    }
  }, [tasksForSelectedDate]);

  const calendarCells = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(start);
    const firstDay = start.getDay();
    const cells: Array<{key: string; date: Date | null}> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({key: `spacer-${i}`, date: null});
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(start.getFullYear(), start.getMonth(), day);
      cells.push({key: `day-${day}`, date});
    }
    return cells;
  }, [currentMonth]);

  const openModalForDate = useCallback(
    (targetDate: Date, existing?: Task) => {
      const baseDate = new Date(targetDate);
      setFormDate(baseDate);
      setFormTime(
        existing?.time ? parseTime(existing.time, baseDate) : roundToNextHour(baseDate),
      );
      setFormText(existing?.text ?? '');
      if (existing) {
        setEditingState({id: existing.id, task: existing});
      } else {
        setEditingState(null);
      }
      setModalVisible(true);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingState(null);
    setIosPickerMode(null);
  }, []);

  const openDatePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      if (DateTimePickerAndroid?.open) {
        DateTimePickerAndroid.open({
          mode: 'date',
          value: formDate,
          onChange: (_, selected) => {
            if (selected) {
              setFormDate(selected);
            }
          },
        });
      }
      return;
    }
    setIosPickerMode(prev => (prev === 'date' ? null : 'date'));
  }, [formDate]);

  const openTimePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      if (DateTimePickerAndroid?.open) {
        DateTimePickerAndroid.open({
          mode: 'time',
          is24Hour: false,
          value: formTime,
          onChange: (_, selected) => {
            if (selected) {
              setFormTime(selected);
            }
          },
        });
      }
      return;
    }
    setIosPickerMode(prev => (prev === 'time' ? null : 'time'));
  }, [formTime]);

  const handleSaveTask = useCallback(() => {
    const text = formText.trim();
    if (!text.length) {
      Alert.alert('Task', 'Please describe the task first.');
      return;
    }
    const key = formatDateKey(formDate);
    const updatedAt = new Date().toISOString();
    const timeValue = formatTimeValue(formTime);
    if (editingState) {
      const newTasks = tasks.map(t =>
        t.id === editingState.id
          ? {...t, text, date: key, time: timeValue, updated: updatedAt}
          : t,
      );
      persistTasks(newTasks);
      setSelectedDate(new Date(formDate));
    } else {
      const newTask: Task = {
        id: generateId(),
        text,
        date: key,
        time: timeValue,
        updated: updatedAt,
      };
      persistTasks([...tasks, newTask]);
      setSelectedDate(new Date(formDate));
    }
    closeModal();
  }, [closeModal, editingState, formDate, formText, formTime, tasks]);

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      Alert.alert('Delete task?', 'This will remove the reminder from your calendar.', [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const filtered = tasks.filter(t => t.id !== taskId);
            persistTasks(filtered);
          },
        },
      ]);
    },
    [tasks],
  );

  const persistTasks = useCallback(
    (nextTasks: Task[]) => {
      const sorted = [...nextTasks].sort((a, b) =>
        compareTaskDateTime(a.date, a.time, b.date, b.time),
      );
      setTasks(sorted);
      saveTasks(sorted);
    },
    [setTasks],
  );

  const onPrevMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const onNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const today = useMemo(() => new Date(), []);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {deadlineNotice && (
          <NotificationBanner
            message={deadlineNotice}
            icon="⏰"
            onDismiss={() => setDeadlineNotice(null)}
          />
        )}
        <Text style={styles.title}>Garden Calendar</Text>

        <View style={styles.card}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={onPrevMonth} style={styles.monthButton}>
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.monthLabelWrapper}>
              <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth)}</Text>
              <Text style={styles.monthSubtitle}>
                Organise watering, pruning, and harvest reminders.
              </Text>
            </View>
            <TouchableOpacity onPress={onNextMonth} style={styles.monthButton}>
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map(label => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map(cell => {
              if (!cell.date) {
                return <View key={cell.key} style={[styles.dayCell, styles.dayCellEmpty]} />;
              }
              const isSelected =
                formatDateKey(cell.date) === formatDateKey(selectedDate);
              const isToday =
                formatDateKey(cell.date) === formatDateKey(today);
              const hasTasks = Boolean(
                tasksByDate.get(formatDateKey(cell.date))?.length,
              );
              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => {
                    setSelectedDate(cell.date as Date);
                  }}>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && styles.dayNumberToday,
                    ]}>
                    {cell.date.getDate()}
                  </Text>
                  {hasTasks && (
                    <View
                      style={[
                        styles.dayDot,
                        {opacity: isSelected ? 1 : 0.75},
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.tasksHeaderRow}>
          <View>
            <Text style={styles.tasksTitle}>
              Tasks for {formatLongDate(selectedDate)}
            </Text>
            <Text style={styles.tasksSubtitle}>
              {tasksForSelectedDate.length
                ? 'Stay on track with today’s plan.'
                : 'No tasks yet. Tap + to schedule one.'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openModalForDate(selectedDate)}
            style={styles.inlineAddButton}>
            <Text style={styles.inlineAddButtonText}>＋</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading tasks…</Text>
        ) : tasksForSelectedDate.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyTitle}>Nothing planned</Text>
            <Text style={styles.emptyBody}>
              Add reminders for sowing, watering, or plant care to keep your garden
              thriving.
            </Text>
          </View>
        ) : (
          tasksForSelectedDate.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.text}</Text>
                <Text style={styles.taskMeta}>
                  {formatMeta(task.date, task.time)}
                </Text>
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity
                  onPress={() => {
                    const targetDate = parseDate(task.date);
                    openModalForDate(targetDate, task);
                  }}
                  style={styles.iconButton}>
                  <Text style={styles.iconButtonText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteTask(task.id)}
                  style={styles.iconButton}>
                  <Text style={styles.iconButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => openModalForDate(selectedDate)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <BottomNavigation activeTab={activeTab} onSelect={onNavigate} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingState ? 'Edit garden task' : 'Add garden task'}
            </Text>
            <TextInput
              value={formText}
              onChangeText={setFormText}
              placeholder="Task description"
              placeholderTextColor={colors.textGray}
              style={styles.modalInput}
              multiline
            />
            <TouchableOpacity onPress={openDatePicker} style={styles.modalPicker}>
              <Text style={styles.modalPickerLabel}>Date</Text>
              <Text style={styles.modalPickerValue}>{formatLongDate(formDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openTimePicker} style={styles.modalPicker}>
              <Text style={styles.modalPickerLabel}>Time</Text>
              <Text style={styles.modalPickerValue}>{formatTimeDisplay(formTime)}</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && iosPickerMode === 'date' && (
              <DateTimePicker
                value={formDate}
                mode="date"
                display="inline"
                onChange={(_, d) => {
                  if (d) setFormDate(d);
                }}
                style={styles.iosPicker}
              />
            )}

            {Platform.OS === 'ios' && iosPickerMode === 'time' && (
              <DateTimePicker
                value={formTime}
                mode="time"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setFormTime(d);
                }}
                style={styles.iosPicker}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveTask}>
                <Text style={styles.modalSaveText}>
                  {editingState ? 'Save' : 'Add Task'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {month: 'long', year: 'numeric'}).format(
    date,
  );
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeDisplay(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatTimeValue(date: Date) {
  const h = `${date.getHours()}`.padStart(2, '0');
  const m = `${date.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

function formatMeta(date: string, time?: string) {
  const parsedDate = parseDate(date);
  const friendly = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
  if (!time) {
    return friendly;
  }
  const parsedTime = parseTime(time, parsedDate);
  const timeLabel = formatTimeDisplay(parsedTime);
  return `${friendly} • ${timeLabel}`;
}

function compareTaskDateTime(
  dateA: string,
  timeA: string | undefined,
  dateB: string,
  timeB: string | undefined,
) {
  const a = parseDateTime(dateA, timeA);
  const b = parseDateTime(dateB, timeB);
  return a.getTime() - b.getTime();
}

function parseTime(value: string | undefined, baseDate: Date) {
  if (!value) {
    return new Date(baseDate);
  }
  const [hour, minute] = value.split(':').map(Number);
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour ?? 0, minute ?? 0);
}

function parseDateTime(date: string, time?: string) {
  const base = parseDate(date);
  if (!time) {
    return base;
  }
  const [hour, minute] = time.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour ?? 0, minute ?? 0);
}

function generateId() {
  return `task-${Math.random().toString(36).slice(2, 10)}`;
}

function roundToNextHour(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  copy.setHours(copy.getHours() + 1);
  return copy;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.greenLight,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    color: colors.greenPrimary,
    fontSize: 20,
  },
  monthLabelWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  monthLabel: {
    color: colors.greenPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthSubtitle: {
    marginTop: 2,
    color: colors.textGray,
    fontSize: 12,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textGray,
    fontWeight: 'bold',
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dayCellEmpty: {
    opacity: 0,
  },
  dayCellSelected: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.greenPrimary,
    borderRadius: 12,
  },
  dayNumber: {
    color: colors.textDark,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: colors.greenPrimary,
  },
  dayNumberToday: {
    color: colors.greenPrimary,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.greenPrimary,
    marginTop: 4,
  },
  tasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  tasksSubtitle: {
    color: colors.textGray,
    fontSize: 12,
  },
  inlineAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddButtonText: {
    color: '#fff',
    fontSize: 22,
    marginTop: -2,
  },
  loadingText: {
    textAlign: 'center',
    color: colors.textGray,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: colors.textDark,
  },
  emptyBody: {
    color: colors.textGray,
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  taskInfo: {
    flex: 1,
    paddingRight: 12,
  },
  taskTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.textDark,
  },
  taskMeta: {
    color: colors.textGray,
    marginTop: 4,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.greenLight,
  },
  iconButtonText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 34,
    marginTop: -4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.greenPrimary,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 80,
    color: colors.textDark,
  },
  modalPicker: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 12,
    padding: 12,
  },
  modalPickerLabel: {
    fontSize: 12,
    color: colors.textGray,
  },
  modalPickerValue: {
    fontSize: 16,
    color: colors.textDark,
    marginTop: 2,
  },
  iosPicker: {
    alignSelf: 'stretch',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: colors.textGray,
    fontWeight: '600',
  },
  modalSave: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.greenPrimary,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
