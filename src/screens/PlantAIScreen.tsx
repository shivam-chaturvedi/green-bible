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
      setMessages(prev => [...prev, createMessage(role, text)]);
    },
    [],
  );

  const buildPromptWithContext = useCallback(
    (userPrompt: string) => {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const dateLabel = formatLongDate(now);
      const timeLabel = formatShortTime(now);
      return (
        'You are a gardening assistant within the Green Bible mobile app. ' +
        'Use the context to tailor your response and keep it actionable.\n\n' +
        'Context:\n' +
        `- Local date: ${dateLabel}\n` +
        `- Local time: ${timeLabel}\n` +
        `- User location: ${locationSummary}\n` +
        `- User locale: ${locale}\n` +
        '- App mode: mobile chat assistant for gardeners.\n\n' +
        `User question: ${userPrompt}\n` +
        'Instructions: Provide a friendly, concise answer with practical steps. ' +
        'If information is insufficient, state the limitation and suggest next actions.'
      );
    },
    [locationSummary, now],
  );

  const requestAiResponse = useCallback(
    async (prompt: string) => {
      setLoading(true);
      setThinking(true);
      try {
        const response = await sendGeminiPrompt(buildPromptWithContext(prompt));
        const reply = response.trim().length
          ? response.trim()
          : getRandomFallback();
        appendMessage('bot', reply);
      } catch {
        appendMessage('bot', getRandomFallback());
      } finally {
        setLoading(false);
        setThinking(false);
      }
    },
    [appendMessage, buildPromptWithContext],
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
