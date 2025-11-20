import {Asset} from 'react-native-image-picker';

const BASE_URL = 'https://leaf-disease-api-v3fr.onrender.com/predict';

export type RawDiagnosisResponse = {
  predicted_label?: string;
  confidence?: number;
  all_confidences?: Record<string, number>;
};

export type LeafDiagnosis = {
  label: string;
  confidence: number;
  breakdown: Record<string, number>;
};

export async function analyzeLeafPhoto(asset: Asset): Promise<LeafDiagnosis> {
  if (!asset || !asset.uri) {
    throw new Error('No photo selected.');
  }

  const fileName = asset.fileName || `leaf-photo-${Date.now()}.jpg`;
  const fileType = asset.type || 'image/jpeg';

  const formData = new FormData();
  const file: any = {
    uri: asset.uri,
    name: fileName,
    type: fileType,
  };
  formData.append('file', file);

  const response = await fetch(BASE_URL, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText ? `Server error: ${response.status}` : 'Unable to analyze image right now.',
    );
  }

  const json = (await response.json()) as RawDiagnosisResponse;
  if (!json.predicted_label || typeof json.confidence !== 'number') {
    throw new Error('Invalid response from server.');
  }

  return {
    label: json.predicted_label,
    confidence: json.confidence,
    breakdown: json.all_confidences ?? {[json.predicted_label]: json.confidence},
  };
}
