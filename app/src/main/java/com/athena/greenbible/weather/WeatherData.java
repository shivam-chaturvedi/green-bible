package com.athena.greenbible.weather;

import java.util.Locale;

public class WeatherData {
    private final String resolvedAddress;
    private final double temperature;
    private final double humidity;
    private final double precipitation;
    private final String summary;

    public WeatherData(String resolvedAddress, double temperature, double humidity, double precipitation, String summary) {
        this.resolvedAddress = resolvedAddress;
        this.temperature = temperature;
        this.humidity = humidity;
        this.precipitation = precipitation;
        this.summary = summary;
    }

    public String getResolvedAddress() {
        return resolvedAddress;
    }

    public double getTemperature() {
        return temperature;
    }

    public double getHumidity() {
        return humidity;
    }

    public double getPrecipitation() {
        return precipitation;
    }

    public String getSummary() {
        return summary;
    }

    public String buildHeadline() {
        String addressPart = resolvedAddress != null ? resolvedAddress : "Current location";
        return addressPart + " • " + formatTemp() + " • " + summary;
    }

    public String formatTemp() {
        if (Double.isNaN(temperature)) {
            return "--";
        }
        return String.format(Locale.getDefault(), "%.1f°C", temperature);
    }
}
