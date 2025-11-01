package com.athena.greenbible.network;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GeminiClient {

    private static final String GEMINI_API_KEY = "AIzaSyCTCIx4gdJmRQ6iGN6gj89NCtsAjeRY7uU";
    private static final String GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());

    private GeminiClient() {}

    public interface GeminiCallback {
        void onSuccess(String response);
        void onError(Exception exception);
    }

    public static void sendPrompt(String prompt, GeminiCallback callback) {
        EXECUTOR.execute(() -> {
            try {
                String raw = callGemini(prompt);
                String formatted = formatResponse(raw);
                MAIN_HANDLER.post(() -> callback.onSuccess(formatted));
            } catch (Exception e) {
                MAIN_HANDLER.post(() -> callback.onError(e));
            }
        });
    }

    private static String callGemini(String prompt) throws IOException, JSONException {
        URL url = new URL(GEMINI_ENDPOINT + "?key=" + GEMINI_API_KEY);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        connection.setDoOutput(true);

        try {
            JSONObject request = new JSONObject();
            JSONArray contents = new JSONArray();
            JSONObject content = new JSONObject();
            JSONArray parts = new JSONArray();
            JSONObject part = new JSONObject();
            part.put("text", prompt);
            parts.put(part);
            content.put("role", "user");
            content.put("parts", parts);
            contents.put(content);
            request.put("contents", contents);

            byte[] body = request.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = connection.getOutputStream()) {
                os.write(body);
                os.flush();
            }

            int code = connection.getResponseCode();
            InputStream stream = (code >= 200 && code < 300)
                    ? connection.getInputStream()
                    : connection.getErrorStream();
            String response = readStream(stream);

            if (code < 200 || code >= 300) {
                throw new IOException("Gemini error " + code + ": " + response);
            }

            JSONObject root = new JSONObject(response);
            JSONArray candidates = root.optJSONArray("candidates");
            if (candidates != null && candidates.length() > 0) {
                JSONObject candidate = candidates.optJSONObject(0);
                if (candidate != null) {
                    JSONObject contentObj = candidate.optJSONObject("content");
                    if (contentObj != null) {
                        JSONArray partsArr = contentObj.optJSONArray("parts");
                        if (partsArr != null && partsArr.length() > 0) {
                            JSONObject textPart = partsArr.optJSONObject(0);
                            if (textPart != null) {
                                String text = textPart.optString("text", "");
                                if (!text.isEmpty()) {
                                    return text;
                                }
                            }
                        }
                    }
                }
            }
            return "";
        } finally {
            connection.disconnect();
        }
    }

    private static String readStream(InputStream stream) throws IOException {
        if (stream == null) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        return sb.toString();
    }

    private static String formatResponse(String raw) {
        String cleaned = raw == null ? "" : raw;
        cleaned = cleaned.replace("**", "");
        cleaned = cleaned.replace("\n\n", "\n");
        cleaned = cleaned.replace("* ", "• ");
        return cleaned.trim();
    }
}
