package com.athena.greenbible.weather;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class WeatherService {

    private static final String API_KEY = "2RMQ5RB9QYXUC9VLKW6S6MRBU";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());

    private WeatherService() {}

    public interface Callback {
        void onSuccess(WeatherData data);
        void onError(String message);
    }

    public static void fetchWeather(double lat, double lon, Callback callback) {
        EXECUTOR.execute(() -> {
            try {
                WeatherData data = request(lat, lon);
                MAIN_HANDLER.post(() -> callback.onSuccess(data));
            } catch (Exception e) {
                MAIN_HANDLER.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Unable to load weather"));
            }
        });
    }

    private static WeatherData request(double lat, double lon) throws Exception {
        String location = String.format(Locale.US, "%.4f,%.4f", lat, lon);
        String urlString = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
                + URLEncoder.encode(location, "UTF-8")
                + "?unitGroup=metric&key=" + API_KEY + "&contentType=json";

        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(15000);

        int responseCode = connection.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK) {
            throw new IllegalStateException("Weather request failed: " + responseCode);
        }

        BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder response = new StringBuilder();
        String inputLine;
        while ((inputLine = in.readLine()) != null) {
            response.append(inputLine);
        }
        in.close();
        connection.disconnect();

        JSONObject jsonResponse = new JSONObject(response.toString());
        String resolvedAddress = jsonResponse.optString("resolvedAddress", "Current location");
        JSONObject current = jsonResponse.optJSONObject("currentConditions");
        if (current == null) {
            throw new IllegalStateException("Weather data unavailable");
        }
        double temp = current.optDouble("temp", Double.NaN);
        double humidity = current.optDouble("humidity", Double.NaN);
        double precip = current.optDouble("precip", 0);
        String summary = current.optString("conditions", "Calm conditions");
        return new WeatherData(resolvedAddress, temp, humidity, precip, summary);
    }
}
