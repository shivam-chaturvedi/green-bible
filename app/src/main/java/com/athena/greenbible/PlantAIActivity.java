package com.athena.greenbible;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.athena.greenbible.network.GeminiClient;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.progressindicator.CircularProgressIndicator;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PlantAIActivity extends AppCompatActivity {

    private static final String[] FALLBACK_TIPS = new String[]{
            "I'm having trouble connecting right now. Try checking for pests on the underside of leaves—they often hide there.",
            "The AI is taking a breather. In the meantime, remember to water early in the morning to reduce evaporation.",
            "I hit a snag reaching Gemini. Consider adding a thin layer of mulch to help your soil retain moisture."
    };
    private static final String[] QUICK_QUESTIONS = new String[]{
            "What vegetables can I plant this month?",
            "How do I treat leaf spots on tomatoes?",
            "How often should I water herbs indoors?",
            "What are eco-friendly pest control tips?"
    };
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.getDefault());
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault());

    private EditText inputMessage;
    private ImageButton sendButton;
    private LinearLayout chatContainer;
    private ScrollView chatScrollView;
    private BottomNavigationView bottomNavigationView;
    private CircularProgressIndicator loadingIndicator;
    private TextView todayLabel;
    private TextView timeLabel;
    private LinearLayout quickQuestionsContainer;

    private ExecutorService executorService;
    private Handler mainHandler;
    private View thinkingView;
    private FusedLocationProviderClient fusedLocationClient;
    private String locationSummary = "Unknown location";

    private static final int REQUEST_LOCATION_PERMISSION = 2001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_plant_ai);

        inputMessage = findViewById(R.id.inputMessage);
        sendButton = findViewById(R.id.sendButton);
        chatContainer = findViewById(R.id.chatContainer);
        chatScrollView = findViewById(R.id.chatScrollView);
        bottomNavigationView = findViewById(R.id.bottom_navigation);
        loadingIndicator = findViewById(R.id.loadingIndicator);
        todayLabel = findViewById(R.id.todayLabel);
        timeLabel = findViewById(R.id.timeLabel);
        quickQuestionsContainer = findViewById(R.id.quickQuestionsContainer);
        if (loadingIndicator != null) {
            loadingIndicator.setIndeterminate(true);
        }

        executorService = Executors.newSingleThreadExecutor();
        mainHandler = new Handler(Looper.getMainLooper());
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        bottomNavigationView.setSelectedItemId(R.id.nav_ai);
        setupNavigation();
        updateHeaderDate();
        populateQuickQuestions();
        addBotMessage("Hello! I'm your Plant Assistant. Ask me anything about planting, care, or sustainability and I'll do my best to help.");
        fetchLocation();

        sendButton.setOnClickListener(v -> {
            String userText = inputMessage.getText().toString().trim();
            if (!userText.isEmpty()) {
                inputMessage.setText("");
                handleUserPrompt(userText);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateHeaderDate();
    }

    private void setupNavigation() {
        bottomNavigationView.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, MainActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_ai) return true;
            if (id == R.id.nav_health) {
                startActivity(new Intent(this, PlantHealthActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_sustain) {
                startActivity(new Intent(this, SustainabilityActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_calendar) {
                startActivity(new Intent(this, CalendarActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_about) {
                startActivity(new Intent(this, AboutActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            return false;
        });
    }

    private void handleUserPrompt(String prompt) {
        addUserMessage(prompt);
        requestAiResponse(prompt);
    }

    private void requestAiResponse(String prompt) {
        setLoading(true);
        showThinkingIndicator();
        GeminiClient.sendPrompt(buildPromptWithContext(prompt), new GeminiClient.GeminiCallback() {
            @Override
            public void onSuccess(String response) {
                hideThinkingIndicator();
                String reply = (response == null || response.trim().isEmpty()) ? getFallbackMessage() : response;
                addBotMessage(reply);
                setLoading(false);
            }

            @Override
            public void onError(Exception exception) {
                hideThinkingIndicator();
                addBotMessage(getFallbackMessage());
                setLoading(false);
            }
        });
    }

    private void addUserMessage(String text) {
        LinearLayout bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setBackgroundResource(R.drawable.bg_user_bubble);
        bubble.setPadding(dp(18), dp(14), dp(18), dp(14));

        TextView message = new TextView(this);
        message.setText(text);
        message.setTextColor(0xFF1B5E20);
        message.setTextSize(14f);
        bubble.addView(message);

        TextView timestamp = new TextView(this);
        timestamp.setText(getCurrentTimeLabel());
        timestamp.setTextColor(ContextCompat.getColor(this, android.R.color.darker_gray));
        timestamp.setTextSize(11f);
        timestamp.setPadding(0, dp(8), 0, 0);
        bubble.addView(timestamp);

        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setOrientation(LinearLayout.HORIZONTAL);
        wrapper.setGravity(Gravity.END);
        LinearLayout.LayoutParams wrapperParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        wrapperParams.setMargins(0, dp(10), 0, dp(10));
        wrapper.setLayoutParams(wrapperParams);

        wrapper.addView(bubble);

        chatContainer.addView(wrapper);
        scrollToBottom();
    }

    private void addBotMessage(String text) {
        LinearLayout bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setBackgroundResource(R.drawable.bg_bot_bubble);
        bubble.setPadding(dp(18), dp(14), dp(18), dp(14));

        TextView response = new TextView(this);
        response.setText(text);
        response.setTextColor(0xFF000000);
        response.setTextSize(14f);
        bubble.addView(response);

        TextView timestamp = new TextView(this);
        timestamp.setText(getCurrentTimeLabel());
        timestamp.setTextColor(ContextCompat.getColor(this, android.R.color.darker_gray));
        timestamp.setTextSize(11f);
        timestamp.setPadding(0, dp(8), 0, 0);
        bubble.addView(timestamp);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        rowParams.setMargins(0, dp(10), 0, dp(10));
        row.setLayoutParams(rowParams);

        ImageView avatar = createBotAvatar();
        row.addView(avatar);

        LinearLayout.LayoutParams bubbleParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        bubbleParams.setMargins(dp(12), 0, 0, 0);
        row.addView(bubble, bubbleParams);

        chatContainer.addView(row);
        scrollToBottom();
    }

    private void scrollToBottom() {
        chatScrollView.post(() -> chatScrollView.fullScroll(ScrollView.FOCUS_DOWN));
    }

    private void showThinkingIndicator() {
        hideThinkingIndicator();

        LinearLayout bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.HORIZONTAL);
        bubble.setBackgroundResource(R.drawable.bg_bot_bubble);
        bubble.setPadding(dp(18), dp(14), dp(18), dp(14));
        bubble.setGravity(Gravity.CENTER_VERTICAL);

        ProgressBar progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleSmall);
        progressBar.setIndeterminate(true);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        progressParams.setMargins(0, 0, dp(12), 0);
        progressBar.setLayoutParams(progressParams);
        bubble.addView(progressBar);

        TextView thinkingText = new TextView(this);
        thinkingText.setText("Thinking...");
        thinkingText.setTextColor(ContextCompat.getColor(this, android.R.color.darker_gray));
        thinkingText.setTextSize(13f);
        bubble.addView(thinkingText);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        rowParams.setMargins(0, dp(10), 0, dp(10));
        row.setLayoutParams(rowParams);

        row.addView(createBotAvatar());

        LinearLayout.LayoutParams bubbleParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        bubbleParams.setMargins(dp(12), 0, 0, 0);
        row.addView(bubble, bubbleParams);

        thinkingView = row;
        chatContainer.addView(thinkingView);
        scrollToBottom();
    }

    private void hideThinkingIndicator() {
        if (thinkingView != null) {
            chatContainer.removeView(thinkingView);
            thinkingView = null;
        }
    }

    private void setLoading(boolean loading) {
        sendButton.setEnabled(!loading);
        inputMessage.setEnabled(!loading);
        loadingIndicator.setVisibility(loading ? View.VISIBLE : View.GONE);
        setQuickQuestionsEnabled(!loading);
    }

    private String getFallbackMessage() {
        int index = new Random().nextInt(FALLBACK_TIPS.length);
        return FALLBACK_TIPS[index];
    }

    private String getCurrentTimeLabel() {
        return TIME_FMT.format(LocalDateTime.now());
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (executorService != null) {
            executorService.shutdownNow();
        }
    }

    private void updateHeaderDate() {
        LocalDateTime now = LocalDateTime.now();
        if (todayLabel != null) {
            todayLabel.setText(DATE_FMT.format(now));
        }
        if (timeLabel != null) {
            timeLabel.setText(TIME_FMT.format(now));
        }
    }

    private void populateQuickQuestions() {
        if (quickQuestionsContainer == null) return;
        quickQuestionsContainer.removeAllViews();
        for (String question : QUICK_QUESTIONS) {
            TextView chip = new TextView(this);
            chip.setText(question);
            chip.setTextSize(13f);
            chip.setTextColor(ContextCompat.getColor(this, R.color.green_primary));
            chip.setBackgroundResource(R.drawable.bg_question_chip);
            chip.setPadding(dp(16), dp(10), dp(16), dp(10));
            chip.setClickable(true);
            chip.setFocusable(true);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, dp(12), 0);
            chip.setLayoutParams(params);
            chip.setOnClickListener(v -> {
                if (!sendButton.isEnabled()) return;
                handleUserPrompt(question);
            });
            quickQuestionsContainer.addView(chip);
        }
    }

    private void setQuickQuestionsEnabled(boolean enabled) {
        if (quickQuestionsContainer == null) return;
        for (int i = 0; i < quickQuestionsContainer.getChildCount(); i++) {
            View child = quickQuestionsContainer.getChildAt(i);
            child.setEnabled(enabled);
            child.setAlpha(enabled ? 1f : 0.5f);
        }
    }

    private String buildPromptWithContext(String userPrompt) {
        LocalDateTime now = LocalDateTime.now();
        StringBuilder sb = new StringBuilder();
        sb.append("You are a gardening assistant within the Green Bible mobile app. ");
        sb.append("Use the context to tailor your response and keep it actionable.\n\n");
        sb.append("Context:\n");
        sb.append("- Local date: ").append(DATE_FMT.format(now)).append("\n");
        sb.append("- Local time: ").append(TIME_FMT.format(now)).append("\n");
        sb.append("- User location: ").append(locationSummary).append("\n");
        sb.append("- User locale: ").append(Locale.getDefault().toLanguageTag()).append("\n");
        sb.append("- App mode: mobile chat assistant for gardeners.\n\n");
        sb.append("User question: ").append(userPrompt).append("\n");
        sb.append("Instructions: Provide a friendly, concise answer with practical steps. ");
        sb.append("If information is insufficient, state the limitation and suggest next actions.");
        return sb.toString();
    }

    private ImageView createBotAvatar() {
        ImageView avatar = new ImageView(this);
        int size = dp(32);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(size, size);
        avatar.setLayoutParams(params);
        avatar.setImageResource(R.drawable.ic_leaf);
        avatar.setContentDescription("Bot avatar");
        return avatar;
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }

    private void fetchLocation() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_LOCATION_PERMISSION);
            return;
        }

        fusedLocationClient.getLastLocation()
                .addOnSuccessListener(location -> {
                    if (location != null) {
                        executorService.execute(() -> {
                            String summary = buildLocationSummary(location.getLatitude(), location.getLongitude());
                            mainHandler.post(() -> {
                                locationSummary = summary;
                                updateHeaderDate();
                            });
                        });
                    }
                })
                .addOnFailureListener(e -> locationSummary = "Location unavailable");
    }

    private String buildLocationSummary(double lat, double lon) {
        try {
            if (android.location.Geocoder.isPresent()) {
                android.location.Geocoder geocoder = new android.location.Geocoder(getApplicationContext(), Locale.getDefault());
                List<android.location.Address> results = geocoder.getFromLocation(lat, lon, 1);
                if (results != null && !results.isEmpty()) {
                    android.location.Address address = results.get(0);
                    StringBuilder sb = new StringBuilder();
                    if (address.getLocality() != null) {
                        sb.append(address.getLocality());
                    }
                    if (address.getAdminArea() != null) {
                        if (sb.length() > 0) sb.append(", ");
                        sb.append(address.getAdminArea());
                    }
                    if (address.getCountryName() != null) {
                        if (sb.length() > 0) sb.append(", ");
                        sb.append(address.getCountryName());
                    }
                    if (sb.length() > 0) {
                        sb.append(String.format(Locale.getDefault(), " (%.4f, %.4f)", lat, lon));
                        return sb.toString();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return String.format(Locale.getDefault(), "Lat %.4f, Lon %.4f", lat, lon);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                fetchLocation();
            } else {
                locationSummary = "Location permission denied";
            }
        }
    }
}
