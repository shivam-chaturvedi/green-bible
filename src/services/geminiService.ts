const GEMINI_API_KEY = 'AIzaSyCTCIx4gdJmRQ6iGN6gj89NCtsAjeRY7uU';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_USER_AGENT = 'GreenGarden/1.0';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{text?: string}>;
    };
  }>;
};

export async function sendGeminiPrompt(prompt: string): Promise<string> {
  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{text: prompt}],
      },
    ],
  });

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': GEMINI_USER_AGENT,
    },
    body,
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Gemini error ${response.status}: ${rawText || 'No response body'}`,
    );
  }

  const payload: GeminiResponse = rawText ? JSON.parse(rawText) : {};
  const candidate = payload?.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  const text = typeof part?.text === 'string' ? part.text : '';
  return formatGeminiResponse(text);
}

export function formatGeminiResponse(raw: string) {
  let cleaned = raw ?? '';
  cleaned = cleaned.replace(/\*\*/g, '');
  cleaned = cleaned.replace(/\n{2,}/g, '\n');
  cleaned = cleaned.replace(/\* /g, '• ');
  return cleaned.trim();
}

export const geminiUserAgent = GEMINI_USER_AGENT;
