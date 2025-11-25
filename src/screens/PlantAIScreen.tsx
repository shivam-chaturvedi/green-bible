import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {AppTab, ChatMessage} from '../types';
import {colors} from '../theme/colors';
import {BottomNavigation} from '../components/BottomNavigation';
import {QUICK_QUESTIONS} from '../constants/plantAI';
import {
  createMessage,
  formatLongDate,
  formatShortTime,
} from '../utils/formatters';
import {getRandomFallback} from '../utils/ai';
import {sendGeminiPrompt} from '../services/geminiService';
import {buildLocationSummary} from '../services/locationService';
import {ensureLocationPermission} from '../services/permissionService';
import {addTask} from '../services/taskService';
import {
  loadChatHistory,
  loadHistoryLimit,
  persistChatHistory,
  saveHistoryLimit,
  trimHistory,
} from '../services/chatHistoryService';

type Props = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
};

function initialMessages() {
  return [
    createMessage(
      'bot',
      "Hello! I'm your Plant Assistant. Ask me anything about planting, care, or sustainability and I'll do my best to help.",
    ),
  ];
}

export function PlantAIScreen({activeTab, onNavigate}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [locationSummary, setLocationSummary] = useState('Unknown location');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [now, setNow] = useState(new Date());
  const [historyLimit, setHistoryLimit] = useState<number>(5);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const updateClock = useCallback(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    const timer = setInterval(updateClock, 60 * 1000);
    return () => clearInterval(timer);
  }, [updateClock]);

  const appendMessage = useCallback(
    (role: 'user' | 'bot', text: string) => {
      setMessages(prev => {
        const next = trimHistory([...prev, createMessage(role, text)], historyLimit);
        persistChatHistory(next, historyLimit);
        return next;
      });
    },
    [historyLimit],
  );

  const hydrateHistory = useCallback(async () => {
    const limit = await loadHistoryLimit();
    setHistoryLimit(limit);
    const stored = await loadChatHistory(limit);
    if (stored.length) {
      setMessages(trimHistory(stored, limit));
    }
  }, []);

  const buildPromptWithContext = useCallback(
    (userPrompt: string, chatHistory: ChatMessage[]) => {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const dateLabel = formatLongDate(now);
      const timeLabel = formatShortTime(now);
      const recent = chatHistory.slice(-5);
      
      const chatContext = recent.length
        ? recent.map(msg => `- ${msg.role}: ${msg.text}`).join('\n')
        : '- none yet';
      return (
        'You are a gardening assistant within the Green Bible mobile app. ' +
        'Use the context to tailor your response and keep it actionable.\n\n' +
        'Context:\n' +
        `- Local date: ${dateLabel}\n` +
        `- Local time: ${timeLabel}\n` +
        `- User location: ${locationSummary}\n` +
        `- User locale: ${locale}\n` +
        `- Current date and time is : ${new Date()}`+
        'Recent chat (last 5 messages, newest last):\n' +
        `${chatContext}\n\n` +
        '- App mode: mobile chat assistant for gardeners.\n\n' +
        `User question: ${userPrompt}\n` +
        'Instructions: Provide a friendly, concise answer with practical steps. ' +
        'If information is insufficient, state the limitation and suggest next actions. ' +
        'Always respond on a single line using this exact schema: answer:<your concise answer> , STRIUCTLY RETUREN REOSNPONES ELIKE event:< {Title of event + description without the tetx "Title of event" or "description" } ,{YYYY-MM-DD-HH:mm} in javascript format only > or event:<NA> when no scheduling is needed. Title should be short and actionable, and only include event when useful or explicitly requested. if TASK NAME IS NOT MENTIONSED THEN CHOOSE BY UR SELF BASED ON ALL PROMRPT AND CONETENT OF PREVIOUS CHATS U ARE GIVEN '
      );
    },
    [locationSummary, now],
  );

  const requestAiResponse = useCallback(
    async (prompt: string) => {
      setLoading(true);
      setThinking(true);
      try {
        const response = await sendGeminiPrompt(buildPromptWithContext(prompt, messages));
        const reply = response.trim().length
          ? response.trim()
          : getRandomFallback();

        const parsed = parseAiReply(reply);
        appendMessage('bot', parsed.answerText);

        if (parsed.eventDate) {
          console.log('AI event parsed for scheduling', {
            rawReply: reply,
            eventTitle: parsed.eventTitle,
            eventDate: parsed.eventDate.toISOString(),
          });
          try {
            const saved = await addTask(parsed.eventTitle, parsed.eventDate);
            console.log('AI event saved to calendar', saved);
            appendMessage(
              'bot',
              `I scheduled "${saved.text}" for ${formatLongDate(parsed.eventDate)} at ${formatShortTime(parsed.eventDate)} in your calendar.`,
            );
          } catch (error) {
            console.warn('Failed to save AI event to calendar', error);
            appendMessage('bot', 'I tried to schedule that, but saving to your calendar failed.');
          }
        } else {
          console.log('AI event parse found no schedulable event', {
            rawReply: reply,
            eventTitle: parsed.eventTitle,
          });
        }
      } catch {
        appendMessage('bot', getRandomFallback());
      } finally {
        setLoading(false);
        setThinking(false);
      }
    },
    [appendMessage, buildPromptWithContext, messages],
  );

  const handlePrompt = useCallback(
    (prompt: string) => {
      if (loading) {
        return;
      }
      const trimmed = prompt.trim();
      if (!trimmed.length) {
        return;
      }
      appendMessage('user', trimmed);
      setInputValue('');
      requestAiResponse(trimmed);
    },
    [appendMessage, loading, requestAiResponse],
  );

  useEffect(() => {
    hydrateHistory();
  }, [hydrateHistory]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({animated: true});
    }
  }, [messages, thinking]);

  const requestLocationSummary = useCallback(async () => {
    const allowed = await ensureLocationPermission({
      title: 'Location permission',
      message:
        'GreenGarden tailors answers with your nearby climate. Please enable location access to get more relevant tips.',
    });
    if (!allowed) {
      setPermissionDenied(true);
      setLocationSummary('Location permission required');
      return;
    }
    setPermissionDenied(false);
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
    }

    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        const fallback = `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`;
        setLocationSummary(fallback);
        buildLocationSummary(latitude, longitude)
          .then(summary => {
            setLocationSummary(summary);
            updateClock();
          })
          .catch(() => setLocationSummary(fallback));
      },
      error => {
        setLocationSummary(error?.message ?? 'Location unavailable');
        if (error?.code === 1) {
          setPermissionDenied(true);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [updateClock]);

  useEffect(() => {
    requestLocationSummary();
  }, [requestLocationSummary]);

  const canSend = inputValue.trim().length > 0 && !loading;

  const historyOptions = [
    {label: 'Last 5', value: 5},
    {label: 'Last 10', value: 10},
    {label: 'All time', value: 0},
  ];

  const handleHistoryLimitChange = useCallback(
    async (value: number) => {
      setHistoryLimit(value === 0 ? 0 : value);
      await saveHistoryLimit(value);
      const refreshed = await loadChatHistory(value);
      setMessages(trimHistory(refreshed, value));
    },
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.aiScreen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={16}>
      <View style={styles.aiContainer}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiDate}>{formatLongDate(now)}</Text>
          <Text style={styles.aiTime}>{formatShortTime(now)}</Text>
          <Text style={styles.aiSubtitle}>
            Need inspiration? Tap a quick question or type your own to ask the
            plant assistant.
          </Text>
          <ScrollView
            horizontal
            style={styles.quickQuestionScroll}
            contentContainerStyle={styles.quickQuestionContent}
            showsHorizontalScrollIndicator={false}>
            {QUICK_QUESTIONS.map(question => (
              <TouchableOpacity
                key={question}
                style={styles.quickQuestionChip}
                onPress={() => handlePrompt(question)}>
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.locationContext} numberOfLines={2}>
            Context: {locationSummary}
          </Text>
          {permissionDenied && (
            <Text style={styles.locationWarning}>
              Location permission denied — using generic advice.
            </Text>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Chat saving preference</Text>
            <Text style={styles.historySubtitle}>
              Default: last 5. Choose how many past messages to keep.
            </Text>
            <View style={styles.historyChips}>
              {historyOptions.map(option => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.historyChip,
                    historyLimit === option.value && styles.historyChipActive,
                  ]}
                  onPress={() => handleHistoryLimitChange(option.value)}>
                  <Text
                    style={[
                      styles.historyChipText,
                      historyLimit === option.value && styles.historyChipTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {messages.map(message =>
            message.role === 'user' ? (
              <View key={message.id} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{message.text}</Text>
                  <Text style={styles.timestampText}>
                    {formatShortTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ) : (
              <View key={message.id} style={styles.botRow}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarText}>🌱</Text>
                </View>
                <View style={styles.botBubble}>
                  <Text style={styles.botText}>{message.text}</Text>
                  <Text style={styles.timestampText}>
                    {formatShortTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ),
          )}
          {thinking && (
            <View style={styles.botRow}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>🌱</Text>
              </View>
              <View style={styles.thinkingBubble}>
                <ActivityIndicator color={colors.greenPrimary} size="small" />
                <Text style={styles.thinkingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textGray}
            value={inputValue}
            onChangeText={setInputValue}
            editable={!loading}
            onSubmitEditing={() => handlePrompt(inputValue)}
            returnKeyType="send"
          />
          {loading && (
            <ActivityIndicator
              size="small"
              color={colors.greenPrimary}
              style={styles.inputLoader}
            />
          )}
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={() => handlePrompt(inputValue)}
            disabled={!canSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <BottomNavigation activeTab={activeTab} onSelect={onNavigate} />
      </View>
    </KeyboardAvoidingView>
  );
}

function parseAiReply(raw: string): {
  answerText: string;
  eventDate: Date | null;
  eventTitle: string;
} {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const answerMatch = normalized.match(/answer\s*:\s*(.*?)(?:\s*event\s*:|$)/i);
  const answerText = answerMatch?.[1]?.trim() || normalized || getRandomFallback();

  const eventRaw = extractEventBlock(normalized);
  const {eventDate, eventTitle} = parseEventDetails(eventRaw, answerText);

  return {
    answerText,
    eventDate,
    eventTitle,
  };
}

function extractEventBlock(normalized: string): string | null {
  const explicitCurly = normalized.match(/event\s*:\s*\{([^}]*)\}/i)?.[1];
  if (explicitCurly) {
    return explicitCurly.trim();
  }

  const explicitAngle = normalized.match(/event\s*:\s*<([^>]+)>/i)?.[1];
  if (explicitAngle) {
    return explicitAngle.trim();
  }

  const firstCurly = normalized.match(/\{([^}]*)\}/);
  if (firstCurly?.[1]) {
    return firstCurly[1].trim();
  }

  const firstBracket = normalized.match(/<([^>]+)>/);
  return firstBracket?.[1]?.trim() ?? null;
}

function parseEventDetails(value: string | null, fallbackTitle: string): {
  eventDate: Date | null;
  eventTitle: string;
} {
  if (!value || /^NA$/i.test(value)) {
    return {eventDate: null, eventTitle: fallbackTitle};
  }

  const cleaned = value.replace(/[<>{}]/g, '').trim();
  const [titlePart, ...rest] = cleaned.split(',');
  const title = (titlePart ?? '').trim();
  const datePartRaw = rest.join(',').trim();

  if (!datePartRaw) {
    return {eventDate: null, eventTitle: fallbackTitle};
  }

  const dateTime = parseDateTime(datePartRaw);
  if (!dateTime) {
    return {eventDate: null, eventTitle: fallbackTitle};
  }

  return {
    eventDate: dateTime,
    eventTitle: title.length ? title : fallbackTitle,
  };
}

function parseDateTime(value: string): Date | null {
  const cleaned = value.replace(/local time/i, '').trim();
  const match = cleaned.match(/(\d{4}-\d{2}-\d{2})[-T\s]+(\d{1,2}:\d{2})/);
  if (!match) {
    return null;
  }

  const datePart = match[1];
  const [hourRaw, minuteRaw] = match[2].split(':');
  const timePart = `${hourRaw.padStart(2, '0')}:${minuteRaw.padStart(2, '0')}`;

  const isoString = `${datePart}T${timePart}`;
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const styles = StyleSheet.create({
  aiScreen: {
    flex: 1,
    backgroundColor: colors.aiBackground,
  },
  aiContainer: {
    flex: 1,
    backgroundColor: colors.aiBackground,
  },
  aiHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  aiDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  aiTime: {
    fontSize: 12,
    color: colors.textGray,
    marginTop: 4,
  },
  aiSubtitle: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textDark,
  },
  quickQuestionScroll: {
    marginTop: 12,
  },
  quickQuestionContent: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  quickQuestionChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  quickQuestionText: {
    fontSize: 13,
    color: colors.greenPrimary,
    fontWeight: '600',
  },
  locationContext: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textGray,
  },
  locationWarning: {
    marginTop: 4,
    fontSize: 12,
    color: '#C62828',
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingBottom: 20,
  },
  userRow: {
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderRadius: 16,
    padding: 14,
    maxWidth: '85%',
  },
  userText: {
    color: colors.greenPrimary,
    fontSize: 14,
  },
  timestampText: {
    marginTop: 8,
    fontSize: 11,
    color: colors.textGray,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  historyContainer: {
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.greenPrimary,
  },
  historySubtitle: {
    fontSize: 12,
    color: colors.textGray,
    marginTop: 2,
  },
  historyChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  historyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
  },
  historyChipActive: {
    backgroundColor: colors.greenPrimary,
  },
  historyChipText: {
    fontSize: 12,
    color: colors.textDark,
  },
  historyChipTextActive: {
    color: '#FFFFFF',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    elevation: 2,
  },
  botAvatarText: {
    fontSize: 20,
  },
  botBubble: {
    flex: 1,
    backgroundColor: colors.botBubble,
    borderRadius: 16,
    padding: 14,
  },
  botText: {
    fontSize: 14,
    color: '#000000',
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.botBubble,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  thinkingText: {
    marginLeft: 10,
    color: colors.textGray,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.inputBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    marginRight: 8,
    color: colors.textDark,
  },
  inputLoader: {
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: colors.greenPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
