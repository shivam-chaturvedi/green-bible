package com.athena.greenbible;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import com.athena.greenbible.network.GeminiClient;
import com.athena.greenbible.notifications.NotificationHelper;

public class DiagnosisResultActivity extends AppCompatActivity {

    public static final String EXTRA_IMAGE_PATH = "extra_image_path";
    public static final String EXTRA_LABEL = "extra_label";
    public static final String EXTRA_CONFIDENCE = "extra_confidence";
    public static final String EXTRA_BREAKDOWN = "extra_breakdown";

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_diagnosis_result);

        NotificationHelper.requestPermissionIfNeeded(this);
        NotificationHelper.ensureChannel(
                this,
                NotificationHelper.DIAGNOSIS_CHANNEL_ID,
                NotificationHelper.DIAGNOSIS_CHANNEL_NAME,
                NotificationHelper.DIAGNOSIS_CHANNEL_DESC);

        ImageView resultImage = findViewById(R.id.resultImage);
        TextView resultLabel = findViewById(R.id.resultLabel);
        TextView resultConfidence = findViewById(R.id.resultConfidence);
        LinearLayout resultBreakdownList = findViewById(R.id.resultBreakdownList);
        Button btnCure = findViewById(R.id.btnCure);
        Button btnDone = findViewById(R.id.btnDone);
        TextView cureContent = findViewById(R.id.cureContent);
        ProgressBar cureLoading = findViewById(R.id.cureLoading);

        String imagePath = getIntent().getStringExtra(EXTRA_IMAGE_PATH);
        String label = getIntent().getStringExtra(EXTRA_LABEL);
        double confidence = getIntent().getDoubleExtra(EXTRA_CONFIDENCE, 0);
        String breakdownJson = getIntent().getStringExtra(EXTRA_BREAKDOWN);

        Map<String, Double> confidenceMap = null;
        if (breakdownJson != null) {
            confidenceMap = GsonHolder.get().fromJson(breakdownJson, GsonHolder.TYPE_MAP_STRING_DOUBLE);
        }

        final Map<String, Double> finalConfidenceMap = confidenceMap != null ? sortConfidence(confidenceMap) : new LinkedHashMap<>();
        final String primaryDisease = !finalConfidenceMap.isEmpty() ? finalConfidenceMap.entrySet().iterator().next().getKey() : label;
        final double primaryConfidence = !finalConfidenceMap.isEmpty() ? finalConfidenceMap.entrySet().iterator().next().getValue() : confidence;

        if (imagePath != null) {
            File file = new File(imagePath);
            if (file.exists()) {
                Bitmap bitmap = BitmapFactory.decodeFile(imagePath);
                resultImage.setImageBitmap(bitmap);
            }
        }

        if (label != null) {
            resultLabel.setText(primaryDisease != null ? primaryDisease : label);
        }

        resultConfidence.setText(String.format(Locale.getDefault(), "Confidence: %.1f%%", primaryConfidence * 100));

        Map<String, Double> displayMap = new LinkedHashMap<>(finalConfidenceMap);
        if (primaryDisease != null) {
            displayMap.remove(primaryDisease);
        }
        populateBreakdownList(resultBreakdownList, displayMap);

        if (primaryDisease == null || primaryDisease.trim().isEmpty()) {
            btnCure.setEnabled(false);
        }

        Map<String, Double> finalMapForPrompt = finalConfidenceMap;
        btnCure.setOnClickListener(v -> {
            btnCure.setEnabled(false);
            cureLoading.setVisibility(android.view.View.VISIBLE);
            cureContent.setText("");
            String prompt = buildCurePrompt(primaryDisease, finalMapForPrompt);
            GeminiClient.sendPrompt(prompt, new GeminiClient.GeminiCallback() {
                @Override
                public void onSuccess(String response) {
                    cureLoading.setVisibility(android.view.View.GONE);
                    btnCure.setEnabled(true);
                    String message = response.isEmpty() ? "I could not generate a treatment plan right now." : response;
                    cureContent.setText(message);
                    if (!response.isEmpty()) {
                        String summary = response.split("\n")[0];
                        NotificationHelper.showNotification(
                                DiagnosisResultActivity.this,
                                NotificationHelper.DIAGNOSIS_CHANNEL_ID,
                                NotificationHelper.DIAGNOSIS_CHANNEL_NAME,
                                NotificationHelper.DIAGNOSIS_CHANNEL_DESC,
                                primaryDisease != null ? primaryDisease : "Cure advice ready",
                                summary.length() > 120 ? summary.substring(0, 117) + "..." : summary,
                                (NotificationHelper.DIAGNOSIS_CHANNEL_ID + primaryDisease).hashCode());
                    }
                }

                @Override
                public void onError(Exception exception) {
                    cureLoading.setVisibility(android.view.View.GONE);
                    btnCure.setEnabled(true);
                    cureContent.setText("Unable to fetch cure advice. Please try again.");
                }
            });
        });

        btnDone.setOnClickListener(v -> finish());
    }

    private Map<String, Double> sortConfidence(Map<String, Double> confidenceMap) {
        ArrayList<Map.Entry<String, Double>> entries = new ArrayList<>(confidenceMap.entrySet());
        Collections.sort(entries, (o1, o2) -> Double.compare(o2.getValue(), o1.getValue()));
        LinkedHashMap<String, Double> sorted = new LinkedHashMap<>();
        for (Map.Entry<String, Double> entry : entries) {
            sorted.put(entry.getKey(), entry.getValue());
        }
        return sorted;
    }

    private void populateBreakdownList(LinearLayout container, Map<String, Double> data) {
        container.removeAllViews();
        if (data == null || data.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("No other issues detected.");
            empty.setTextColor(ContextCompat.getColor(this, R.color.text_dark));
            container.addView(empty);
            return;
        }
        for (Map.Entry<String, Double> entry : data.entrySet()) {
            TextView item = new TextView(this);
            item.setText(entry.getKey());
            item.setTextColor(ContextCompat.getColor(this, R.color.text_dark));
            item.setTextSize(14f);
            item.setBackgroundResource(R.drawable.bg_warning_chip);
            int padding = (int) (getResources().getDisplayMetrics().density * 12);
            item.setPadding(padding, padding / 2, padding, padding / 2);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            params.topMargin = (int) (getResources().getDisplayMetrics().density * 8);
            item.setLayoutParams(params);
            container.addView(item);
        }
    }

    private String buildCurePrompt(String disease, Map<String, Double> confidences) {
        StringBuilder builder = new StringBuilder();
        builder.append("You are an expert plant pathologist assisting a gardener.\n");
        if (disease != null) {
            builder.append("Primary diagnosed disease: ").append(disease).append(".\n");
        }
        if (confidences != null && !confidences.isEmpty()) {
            builder.append("Model confidence breakdown:\n");
            for (Map.Entry<String, Double> entry : confidences.entrySet()) {
                builder.append(String.format(Locale.getDefault(), "- %s: %.1f%%\n", entry.getKey(), entry.getValue() * 100));
            }
        }
        builder.append("Provide a concise, step-by-step treatment plan focusing on eco-friendly and practical remedies. ");
        builder.append("Include prevention tips and when to seek professional help if necessary.");
        return builder.toString();
    }
}
