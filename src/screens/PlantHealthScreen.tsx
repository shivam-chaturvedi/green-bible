import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Asset, launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {AppTab} from '../types';
import {colors} from '../theme/colors';
import {BottomNavigation} from '../components/BottomNavigation';
import {analyzeLeafPhoto} from '../services/leafDiagnosisService';
import {sendGeminiPrompt} from '../services/geminiService';
import {formatPercent} from '../utils/formatters';
import {NotificationBanner} from '../components/NotificationBanner';
import {
  ensureCameraPermission,
  ensurePhotoPermission,
} from '../services/permissionService';

type Props = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
};

type DiagnosisState = {
  label: string;
  confidence: number;
  breakdown: {label: string; confidence: number}[];
  timestamp: Date;
  symptoms?: string;
  photoUri?: string;
};

const DEFAULT_ANALYSIS_STATUS = 'Tap Analyze once everything looks good.';

export function PlantHealthScreen({activeTab, onNavigate}: Props) {
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState(DEFAULT_ANALYSIS_STATUS);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisState | null>(null);
  const [cureAdvice, setCureAdvice] = useState<string | null>(null);
  const [cureError, setCureError] = useState<string | null>(null);
  const [cureLoading, setCureLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);

  const photoStatus = photo
    ? 'Photo selected. Preview ready for review.'
    : 'Waiting for a clear photo of the plant leaf.';
  const symptomStatus = symptoms.trim().length
    ? `Symptoms noted: ${symptoms.trim()}`
    : 'Add symptoms to give the diagnosis more context.';

  const handleSelectAsset = useCallback((asset?: Asset) => {
    if (!asset) {
      return;
    }
    setPhoto(asset);
    setAnalysisStatus(DEFAULT_ANALYSIS_STATUS);
  }, []);

  const openCamera = useCallback(async () => {
    const allowed = await ensureCameraPermission({
      title: 'Camera permission required',
      message: 'Enable camera access to capture a plant photo for diagnosis.',
    });
    if (!allowed) {
      Alert.alert('Camera permission required', 'Enable camera access to capture a photo.');
      return;
    }
    const result = await launchCamera({
      mediaType: 'photo',
      includeBase64: false,
      saveToPhotos: false,
      quality: 0.9,
    });
    if (result.didCancel) {
      return;
    }
    if (result.errorMessage) {
      Alert.alert('Camera error', result.errorMessage);
      return;
    }
    handleSelectAsset(result.assets?.[0]);
  }, [handleSelectAsset]);

  const openGallery = useCallback(async () => {
    const allowed = await ensurePhotoPermission({
      title: 'Gallery permission required',
      message: 'Enable photo library access to choose a plant image.',
    });
    if (!allowed) {
      Alert.alert('Gallery permission required', 'Enable photo library access to choose an image.');
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });
    if (result.didCancel) {
      return;
    }
    if (result.errorMessage) {
      Alert.alert('Gallery error', result.errorMessage);
      return;
    }
    handleSelectAsset(result.assets?.[0]);
  }, [handleSelectAsset]);

  const handleAnalyze = useCallback(async () => {
    if (!photo) {
      Alert.alert('Plant Health', 'Please capture or select a leaf photo first.');
      return;
    }
    try {
      setLoading(true);
      setAnalysisStatus('Analyzing photo for potential diseases...');
      const result = await analyzeLeafPhoto(photo);
      const breakdownEntries = Object.entries(result.breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([label, confidence]) => ({label, confidence}));
      const nextDiagnosis: DiagnosisState = {
        label: result.label,
        confidence: result.confidence,
        breakdown: breakdownEntries,
        timestamp: new Date(),
        symptoms: symptoms.trim(),
        photoUri: photo.uri ?? undefined,
      };
      setDiagnosis(nextDiagnosis);
      setCureAdvice(null);
      setCureError(null);
      setAnalysisStatus('Diagnosis ready! Scroll down for insights.');
      setResultModalVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze image.';
      Alert.alert('Plant Health', message);
      setAnalysisStatus('Diagnosis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [photo, symptoms]);

  const requestCureAdvice = useCallback(async () => {
    if (!diagnosis) {
      return;
    }
    try {
      setCureLoading(true);
      setCureAdvice(null);
      setCureError(null);
      const prompt = buildCurePrompt(diagnosis.label, diagnosis.breakdown);
      const response = await sendGeminiPrompt(prompt);
      const finalMessage = response || 'I could not generate a treatment plan right now.';
      setCureAdvice(finalMessage);
      setBannerMessage('Cure advice sent — check the treatment plan below.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch cure advice. Please try again.';
      setCureError(message);
      setBannerMessage('Unable to fetch cure advice. Please try again.');
    } finally {
      setCureLoading(false);
    }
  }, [diagnosis]);

  const breakdownList = useMemo(() => {
    if (!diagnosis) {
      return [];
    }
    const primary = diagnosis.label;
    return diagnosis.breakdown.filter(item => item.label !== primary);
  }, [diagnosis]);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {bannerMessage && (
          <NotificationBanner
            message={bannerMessage}
            icon="📣"
            onDismiss={() => setBannerMessage(null)}
          />
        )}
        <Text style={styles.title}>Plant Health Diagnosis</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Snapshot</Text>
          <Text style={styles.cardBody}>{photoStatus}</Text>
          <Text style={styles.cardBody}>{symptomStatus}</Text>
          <Text style={styles.cardHighlight}>{analysisStatus}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Plant Image</Text>
          <Text style={styles.cardBody}>
            Take a photo or select an image of the affected plant for AI analysis.
          </Text>
          <View style={styles.uploadRow}>
            <TouchableOpacity style={styles.uploadButton} onPress={openCamera}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadLabel}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={openGallery}>
              <Text style={styles.uploadIcon}>🖼️</Text>
              <Text style={styles.uploadLabel}>Choose Image</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.previewContainer}>
            {photo?.uri ? (
              <Image source={{uri: photo.uri}} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewPlaceholderText}>
                  Your image preview will appear here.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Describe Symptoms</Text>
          <Text style={styles.cardBody}>
            Provide additional details about what you are observing on the plant.
          </Text>
          <TextInput
            style={styles.symptomInput}
            placeholder="e.g., yellow spots, white patches..."
            placeholderTextColor={colors.textGray}
            multiline
            value={symptoms}
            onChangeText={setSymptoms}
          />
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Plant Health</Text>
          )}
        </TouchableOpacity>

        {diagnosis && (
          <TouchableOpacity
            style={[styles.analyzeButton, styles.viewResultsButton]}
            onPress={() => setResultModalVisible(true)}>
            <Text style={styles.analyzeButtonText}>Open Detailed Results</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={resultModalVisible}
        animationType="slide"
        onRequestClose={() => setResultModalVisible(false)}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.title}>Diagnosis Details</Text>
          {diagnosis && (
            <>
              {diagnosis.photoUri && (
                <Image source={{uri: diagnosis.photoUri}} style={styles.resultImage} />
              )}
              <View style={styles.diagnosisHighlight}>
                <Text style={styles.diagnosisLabel}>{diagnosis.label}</Text>
                <Text style={styles.diagnosisConfidence}>
                  Confidence{' '}
                  {formatPercent(Math.max(0, Math.min(100, diagnosis.confidence * 100)))}
                </Text>
              </View>
              {diagnosis.symptoms ? (
                <View style={styles.reportedSymptoms}>
                  <Text style={styles.breakdownTitle}>Reported symptoms</Text>
                  <Text style={styles.reportedSymptomsText}>{diagnosis.symptoms}</Text>
                </View>
              ) : null}
              {breakdownList.length > 0 && (
                <View style={styles.breakdownSection}>
                  <Text style={styles.breakdownTitle}>Other possible issues</Text>
                  {breakdownList.map(item => (
                    <View key={`${item.label}-modal`} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                      <Text style={styles.breakdownValue}>
                        {formatPercent(Math.max(0, Math.min(100, item.confidence * 100)))}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={[styles.cureButton, cureLoading && styles.analyzeButtonDisabled]}
                onPress={requestCureAdvice}
                disabled={cureLoading}>
                {cureLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.cureButtonText}>Get Cure Advice</Text>
                )}
              </TouchableOpacity>
              {(cureAdvice || cureError) && (
                <View style={styles.cureCard}>
                  <Text style={styles.breakdownTitle}>Treatment plan</Text>
                  <Text style={styles.cureText}>{cureAdvice || cureError}</Text>
                </View>
              )}
            </>
          )}
          <TouchableOpacity
            style={[styles.analyzeButton, styles.closeModalButton]}
            onPress={() => setResultModalVisible(false)}>
            <Text style={styles.analyzeButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <BottomNavigation activeTab={activeTab} onSelect={onNavigate} />
    </View>
  );
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
    paddingBottom: 80,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  cardBody: {
    marginTop: 8,
    color: colors.textDark,
    fontSize: 14,
  },
  cardHighlight: {
    marginTop: 12,
    color: colors.greenPrimary,
    fontWeight: 'bold',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.greenPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 22,
  },
  uploadLabel: {
    marginTop: 4,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  previewContainer: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  previewPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenLight,
  },
  previewPlaceholderText: {
    color: colors.textGray,
  },
  symptomInput: {
    marginTop: 12,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.greenPrimary,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
    color: colors.textDark,
  },
  analyzeButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultTimestamp: {
    color: colors.textGray,
    marginTop: 4,
  },
  resultImage: {
    width: '100%',
    height: 200,
    marginTop: 12,
    borderRadius: 12,
  },
  diagnosisHighlight: {
    backgroundColor: colors.greenPrimary,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  diagnosisLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  diagnosisConfidence: {
    marginTop: 4,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  breakdownSection: {
    marginTop: 16,
  },
  breakdownTitle: {
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  breakdownLabel: {
    color: colors.textDark,
  },
  breakdownValue: {
    color: colors.textDark,
    fontWeight: 'bold',
  },
  reportedSymptoms: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.greenLight,
  },
  reportedSymptomsText: {
    color: colors.textDark,
    marginTop: 4,
  },
  cureButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.greenPrimary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cureButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cureCard: {
    marginTop: 12,
    backgroundColor: colors.greenLight,
    borderRadius: 12,
    padding: 12,
  },
  cureText: {
    color: colors.textDark,
    marginTop: 4,
    lineHeight: 20,
  },
  viewResultsButton: {
    backgroundColor: colors.greenPrimary,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.greenLight,
    gap: 16,
  },
  closeModalButton: {
    backgroundColor: colors.textGray,
  },
});

function buildCurePrompt(
  primaryDisease: string,
  confidences: {label: string; confidence: number}[],
) {
  let prompt =
    'You are an expert plant pathologist assisting a gardener using the Green Bible mobile app.\n';
  if (primaryDisease) {
    prompt += `Primary diagnosed disease: ${primaryDisease}.\n`;
  }
  if (confidences.length) {
    prompt += 'Model confidence breakdown:\n';
    confidences.forEach(entry => {
      const pct = Math.max(0, Math.min(100, entry.confidence * 100));
      prompt += `- ${entry.label}: ${pct.toFixed(1)}%\n`;
    });
  }
  prompt +=
    'Provide a concise, step-by-step treatment plan focusing on eco-friendly and practical remedies. Include prevention tips and when to seek professional help if necessary.';
  return prompt;
}
