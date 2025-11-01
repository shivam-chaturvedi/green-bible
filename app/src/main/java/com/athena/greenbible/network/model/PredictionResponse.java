package com.athena.greenbible.network.model;

import com.google.gson.annotations.SerializedName;

import java.util.Map;

public class PredictionResponse {

    @SerializedName("predicted_label")
    private String predictedLabel;

    @SerializedName("confidence")
    private double confidence;

    @SerializedName("all_confidences")
    private Map<String, Double> allConfidences;

    public String getPredictedLabel() {
        return predictedLabel;
    }

    public double getConfidence() {
        return confidence;
    }

    public Map<String, Double> getAllConfidences() {
        return allConfidences;
    }
}
