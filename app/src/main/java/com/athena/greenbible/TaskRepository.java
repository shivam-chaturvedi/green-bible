package com.athena.greenbible;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class TaskRepository {

    private static final String PREFS_NAME = "calendar_tasks";
    private static final String KEY_TASKS = "tasks_json";

    private TaskRepository() {}

    static synchronized List<CalendarActivity.Task> loadTasks(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_TASKS, null);
        ArrayList<CalendarActivity.Task> tasks = new ArrayList<>();
        if (raw == null || raw.isEmpty()) {
            return tasks;
        }
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String id = obj.optString("id", java.util.UUID.randomUUID().toString());
                String text = obj.optString("text", "");
                String dateStr = obj.optString("date", null);
                String timeStr = obj.optString("time", null);
                String updatedStr = obj.optString("updated", null);
                if (dateStr == null) continue;
                LocalDate date = LocalDate.parse(dateStr);
                LocalTime time;
                try {
                    time = (timeStr != null && !timeStr.isEmpty()) ? LocalTime.parse(timeStr) : LocalTime.of(9, 0);
                } catch (Exception e) {
                    time = LocalTime.of(9, 0);
                }
                LocalDateTime updated;
                try {
                    updated = (updatedStr != null && !updatedStr.isEmpty()) ? LocalDateTime.parse(updatedStr) : LocalDateTime.now();
                } catch (Exception e) {
                    updated = LocalDateTime.now();
                }
                tasks.add(new CalendarActivity.Task(id, text, date, time, updated));
            }
        } catch (JSONException e) {
            // ignore corrupt payload
        }
        return tasks;
    }

    static synchronized void saveTasks(Context context, List<CalendarActivity.Task> tasks) {
        JSONArray array = new JSONArray();
        for (CalendarActivity.Task task : tasks) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", task.id);
                obj.put("text", task.getText());
                obj.put("date", task.getDate().toString());
                obj.put("time", task.getTime() != null ? task.getTime().toString() : "");
                obj.put("updated", task.lastUpdated != null ? task.lastUpdated.toString() : "");
                array.put(obj);
            } catch (JSONException ignored) {
            }
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_TASKS, array.toString()).apply();
    }
}
