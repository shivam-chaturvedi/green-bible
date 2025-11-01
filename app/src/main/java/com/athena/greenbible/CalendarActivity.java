package com.athena.greenbible;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import androidx.core.content.ContextCompat;

import com.athena.greenbible.notifications.NotificationHelper;
import com.athena.greenbible.notifications.TaskReminderScheduler;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.card.MaterialCardView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public class CalendarActivity extends AppCompatActivity {

    private TextView monthLabel, tasksTitle;
    private GridLayout calendarGrid;
    private RecyclerView tasksRecycler;
    private FloatingActionButton fab;
    private BottomNavigationView nav;

    // date state
    private LocalDate selectedDate = LocalDate.now();
    private LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);

    // simple in-memory store: key = yyyy-MM-dd
    private final HashMap<String, ArrayList<Task>> tasksMap = new HashMap<>();
    private TaskAdapter adapter;

    private final DateTimeFormatter keyFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.US);
    private final DateTimeFormatter niceFmt = DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.US);
    private final DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US);
    private final DateTimeFormatter metaDateFmt = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);
    public static final DateTimeFormatter TIME_FMT_DISPLAY = DateTimeFormatter.ofPattern("h:mm a", Locale.US);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_calendar);

        NotificationHelper.requestPermissionIfNeeded(this);
        NotificationHelper.ensureChannel(
                this,
                NotificationHelper.TASK_CHANNEL_ID,
                NotificationHelper.TASK_CHANNEL_NAME,
                NotificationHelper.TASK_CHANNEL_DESC);

        monthLabel = findViewById(R.id.monthLabel);
        tasksTitle = findViewById(R.id.tasksTitle);
        calendarGrid = findViewById(R.id.calendarGrid);
        tasksRecycler = findViewById(R.id.tasksRecycler);
        fab = findViewById(R.id.fabAdd);
        nav = findViewById(R.id.bottom_navigation);

        // bottom nav
        nav.setSelectedItemId(R.id.nav_calendar);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home)     { startActivity(new Intent(this, MainActivity.class)); finish(); return true; }
            if (id == R.id.nav_ai)       { startActivity(new Intent(this, PlantAIActivity.class)); finish(); return true; }
            if (id == R.id.nav_health)   { startActivity(new Intent(this, PlantHealthActivity.class)); finish(); return true; }
            if (id == R.id.nav_sustain)  { startActivity(new Intent(this, SustainabilityActivity.class)); finish(); return true; }
            if (id == R.id.nav_calendar) { return true; }
            if (id == R.id.nav_about)    { startActivity(new Intent(this, AboutActivity.class)); finish(); return true; }
            return false;
        });

        // month nav
        ImageButton prev = findViewById(R.id.btnPrevMonth);
        ImageButton next = findViewById(R.id.btnNextMonth);
        prev.setOnClickListener(v -> { currentMonth = currentMonth.minusMonths(1); renderCalendar(); });
        next.setOnClickListener(v -> { currentMonth = currentMonth.plusMonths(1); renderCalendar(); });

        // tasks list
        adapter = new TaskAdapter();
        tasksRecycler.setLayoutManager(new LinearLayoutManager(this));
        tasksRecycler.setAdapter(adapter);

        fab.setOnClickListener(v -> showAddTaskDialog());

        loadTasksFromStorage();

        renderCalendar(); // initial render
        updateTasksForSelected();
    }

    private void renderCalendar() {
        monthLabel.setText(monthFmt.format(currentMonth));
        calendarGrid.removeAllViews();
        calendarGrid.setColumnCount(7);
        int cellsPerRow = 7;

        YearMonth ym = YearMonth.from(currentMonth);
        LocalDate firstOfMonth = currentMonth;
        int length = ym.lengthOfMonth();
        int firstDayOfWeekIndex = firstOfMonth.getDayOfWeek().getValue() % 7; // Sun=0

        int cells = firstDayOfWeekIndex + length;
        int rows = (int) Math.ceil(cells / (double) cellsPerRow);
        calendarGrid.setRowCount(rows);
        LocalDate today = LocalDate.now();
        // make each day view width equally spread using weight: we inflate item_calendar_day into GridLayout
        for (int i = 0; i < firstDayOfWeekIndex; i++) {
            View spacer = new View(this);
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = 0;
            lp.height = dp(56);
            lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            lp.setMargins(dp(2), dp(2), dp(2), dp(2));
            lp.setGravity(Gravity.FILL);
            spacer.setLayoutParams(lp);
            calendarGrid.addView(spacer);
        }

        for (int day = 1; day <= length; day++) {
            View cell = LayoutInflater.from(this).inflate(R.layout.item_calendar_day, calendarGrid, false);
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = 0;
            lp.height = dp(56);
            lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
            lp.setMargins(dp(2), dp(2), dp(2), dp(2));
            lp.setGravity(Gravity.FILL);
            cell.setLayoutParams(lp);

            TextView tv = cell.findViewById(R.id.dayNumber);
            View dot = cell.findViewById(R.id.dot);
            MaterialCardView card = cell.findViewById(R.id.dayCard);
            LocalDate date = currentMonth.withDayOfMonth(day);

            tv.setText(String.valueOf(day));
            boolean isSelected = date.equals(selectedDate);
            boolean isToday = date.equals(today);
            int textColorRes = isSelected ? R.color.green_primary : (isToday ? R.color.calendar_day_today_text : R.color.text_dark);
            tv.setTextColor(ContextCompat.getColor(this, textColorRes));

            card.setCardBackgroundColor(ContextCompat.getColor(this,
                    isSelected ? R.color.calendar_day_selected_bg : android.R.color.transparent));
            int strokeColorRes = isSelected ? R.color.green_primary
                    : (isToday ? R.color.calendar_day_today_stroke : R.color.calendar_day_stroke);
            card.setStrokeColor(ContextCompat.getColor(this, strokeColorRes));
            card.setCardElevation(isSelected ? dp(2) : 0f);

            // dot if tasks exist
            dot.setVisibility(hasTasks(date) ? View.VISIBLE : View.GONE);
            dot.setAlpha(isSelected ? 1f : 0.75f);

            cell.setOnClickListener(v -> {
                selectedDate = date;
                renderCalendar();   // re-render selection highlight
                updateTasksForSelected();
            });

            calendarGrid.addView(cell);
        }
    }

    private boolean hasTasks(@NonNull LocalDate date) {
        String key = keyFmt.format(date);
        ArrayList<Task> list = tasksMap.get(key);
        return list != null && !list.isEmpty();
    }

    private void updateTasksForSelected() {
        tasksTitle.setText("Tasks for " + niceFmt.format(selectedDate));
        String key = keyFmt.format(selectedDate);
        ArrayList<Task> list = tasksMap.get(key);
        if (list == null) {
            list = new ArrayList<>();
            tasksMap.put(key, list);
        }
        Collections.sort(list, (a, b) -> a.getDueDateTime().compareTo(b.getDueDateTime()));
        ArrayList<Task> finalList = list;
        adapter.setItems(list, () -> {
            renderCalendar();
            tasksTitle.setText("Tasks for " + niceFmt.format(selectedDate));
            Collections.sort(finalList, (a, b) -> a.getDueDateTime().compareTo(b.getDueDateTime()));
        });
    }

    private void loadTasksFromStorage() {
        tasksMap.clear();
        List<Task> stored = TaskRepository.loadTasks(this);
        for (Task task : stored) {
            String key = keyFmt.format(task.getDate());
            ArrayList<Task> list = tasksMap.get(key);
            if (list == null) {
                list = new ArrayList<>();
                tasksMap.put(key, list);
            }
            list.add(task);
            sortTasks(list);
        }
    }

    private void persistTasks() {
        ArrayList<Task> all = new ArrayList<>();
        for (ArrayList<Task> list : tasksMap.values()) {
            sortTasks(list);
            all.addAll(list);
        }
        TaskRepository.saveTasks(this, all);
    }

    private void sortTasks(ArrayList<Task> list) {
        Collections.sort(list, (a, b) -> a.getDueDateTime().compareTo(b.getDueDateTime()));
    }

    private void showAddTaskDialog() {
        showTaskDialog(false, null, selectedDate);
    }

    private void showEditTaskDialog(int position) {
        String key = keyFmt.format(selectedDate);
        ArrayList<Task> list = tasksMap.get(key);
        if (list == null || position < 0 || position >= list.size()) {
            return;
        }
        showTaskDialog(true, position, selectedDate);
    }

    private void showTaskDialog(boolean isEdit, @Nullable Integer position, @NonNull LocalDate originalDate) {
        View view = getLayoutInflater().inflate(R.layout.dialog_add_task, null, false);
        TextView title = view.findViewById(R.id.dialogTitle);
        EditText etDate = view.findViewById(R.id.etDate);
        EditText etTask = view.findViewById(R.id.etTask);
        EditText etTime = view.findViewById(R.id.etTime);
        Button btnConfirm = view.findViewById(R.id.btnConfirm);

        title.setText(isEdit ? getString(R.string.task_dialog_title_edit) : getString(R.string.task_dialog_title_add));
        btnConfirm.setText(isEdit ? getString(R.string.task_dialog_save_button) : getString(R.string.task_dialog_add_button));

        final int editPosition = position != null ? position : -1;
        final LocalDate[] chosen = new LocalDate[]{ originalDate };
        final LocalTime[] chosenTime = new LocalTime[]{ LocalTime.now().withSecond(0).withNano(0) };
        final String originalKey = keyFmt.format(originalDate);
        ArrayList<Task> originalList = tasksMap.get(originalKey);
        if (originalList == null) {
            originalList = new ArrayList<>();
            tasksMap.put(originalKey, originalList);
        }

        Task editingTask = null;
        if (isEdit && editPosition >= 0 && editPosition < originalList.size()) {
            editingTask = originalList.get(editPosition);
            etTask.setText(editingTask.text);
            etTask.setSelection(editingTask.text.length());
            chosen[0] = editingTask.date;
            if (editingTask.time != null) {
                chosenTime[0] = editingTask.time;
            }
        } else {
            etTask.setText("");
        }

        etDate.setText(niceFmt.format(chosen[0]));
        etTime.setText(TIME_FMT_DISPLAY.format(chosenTime[0]));
        etTask.setError(null);

        Task finalEditingTask = editingTask;
        etDate.setOnClickListener(v -> {
            LocalDate d = chosen[0];
            DatePickerDialog dp = new DatePickerDialog(this, (DatePicker picker, int y, int m, int day) -> {
                LocalDate picked = LocalDate.of(y, m + 1, day);
                chosen[0] = picked;
                etDate.setText(niceFmt.format(picked));
            }, d.getYear(), d.getMonthValue() - 1, d.getDayOfMonth());
            dp.show();
        });

        etTime.setOnClickListener(v -> {
            LocalTime t = chosenTime[0];
            TimePickerDialog tp = new TimePickerDialog(this, (view1, hourOfDay, minute) -> {
                chosenTime[0] = LocalTime.of(hourOfDay, minute);
                etTime.setText(TIME_FMT_DISPLAY.format(chosenTime[0]));
            }, t.getHour(), t.getMinute(), false);
            tp.show();
        });

        AlertDialog dlg = new AlertDialog.Builder(this)
                .setView(view)
                .setCancelable(true)
                .create();

        view.findViewById(R.id.btnCancel).setOnClickListener(v -> dlg.dismiss());
        Task finalEditingTask1 = finalEditingTask;
        btnConfirm.setOnClickListener(v -> {
            String text = etTask.getText().toString().trim();
            if (text.isEmpty()) {
                etTask.setError(getString(R.string.task_error_empty));
                etTask.requestFocus();
                return;
            }

            LocalDate targetDate = chosen[0];
            LocalTime targetTime = chosenTime[0];
            String targetKey = keyFmt.format(targetDate);
            LocalDateTime now = LocalDateTime.now();

            if (isEdit && editPosition >= 0 && finalEditingTask1 != null) {
                ArrayList<Task> sourceList = tasksMap.get(originalKey);
                if (sourceList == null) {
                    sourceList = new ArrayList<>();
                    tasksMap.put(originalKey, sourceList);
                }
                TaskReminderScheduler.cancelTaskReminders(this, finalEditingTask1);
                finalEditingTask1.text = text;
                finalEditingTask1.lastUpdated = now;

                if (targetKey.equals(originalKey)) {
                    finalEditingTask1.date = targetDate;
                    finalEditingTask1.time = targetTime;
                    sortTasks(sourceList);
                } else {
                    sourceList.remove(finalEditingTask1);
                    ArrayList<Task> destList = tasksMap.get(targetKey);
                    if (destList == null) {
                        destList = new ArrayList<>();
                        tasksMap.put(targetKey, destList);
                    }
                    finalEditingTask1.date = targetDate;
                    finalEditingTask1.time = targetTime;
                    destList.add(finalEditingTask1);
                    sortTasks(destList);
                    sortTasks(sourceList);
                    if (sourceList.isEmpty()) {
                        tasksMap.remove(originalKey);
                    }
                }
                TaskReminderScheduler.scheduleTaskReminders(this, finalEditingTask1);
                selectedDate = targetDate;
            } else {
                ArrayList<Task> destList = tasksMap.get(targetKey);
                if (destList == null) {
                    destList = new ArrayList<>();
                    tasksMap.put(targetKey, destList);
                }
                Task newTask = new Task(UUID.randomUUID().toString(), text, targetDate, targetTime, now);
                destList.add(newTask);
                sortTasks(destList);
                TaskReminderScheduler.scheduleTaskReminders(this, newTask);
                selectedDate = targetDate;
            }

            persistTasks();
            updateTasksForSelected();
            renderCalendar();
            dlg.dismiss();
        });

        dlg.show();
    }

    private int dp(int v) {
        float d = getResources().getDisplayMetrics().density;
        return Math.round(v * d);
    }

    // --- RecyclerView adapter
    private class TaskAdapter extends RecyclerView.Adapter<TaskVH> {
        private ArrayList<Task> items = new ArrayList<>();
        private Runnable onChanged;

        void setItems(@NonNull ArrayList<Task> list, Runnable onChanged) {
            items = list;
            this.onChanged = onChanged;
            notifyDataSetChanged();
        }

        @NonNull @Override public TaskVH onCreateViewHolder(@NonNull android.view.ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_task, parent, false);
            return new TaskVH(v);
        }

        @Override public void onBindViewHolder(@NonNull TaskVH h, int pos) {
            Task task = items.get(pos);
            h.text.setText(task.text);
            String timeText = task.time != null ? TIME_FMT_DISPLAY.format(task.time) : "--";
            String meta = metaDateFmt.format(task.date) + " • " + timeText;
            h.meta.setText(meta);
            h.edit.setOnClickListener(v -> {
                int position = h.getBindingAdapterPosition();
                if (position == RecyclerView.NO_POSITION) return;
                showEditTaskDialog(position);
            });
            h.delete.setOnClickListener(v -> {
                int position = h.getBindingAdapterPosition();
                if (position == RecyclerView.NO_POSITION) return;
                if (position < items.size()) {
                    Task removed = items.get(position);
                    TaskReminderScheduler.cancelTaskReminders(CalendarActivity.this, removed);
                    items.remove(position);
                    notifyItemRemoved(position);
                    notifyItemRangeChanged(position, items.size() - position);
                    if (items.isEmpty()) {
                        tasksMap.remove(keyFmt.format(removed.getDate()));
                    }
                    if (onChanged != null) onChanged.run();
                    persistTasks();
                }
            });
        }

        @Override public int getItemCount() { return items.size(); }
    }

    private static class TaskVH extends RecyclerView.ViewHolder {
        final TextView text;
        final TextView meta;
        final ImageButton edit;
        final ImageButton delete;
        TaskVH(@NonNull View itemView) {
            super(itemView);
            text = itemView.findViewById(R.id.taskText);
            meta = itemView.findViewById(R.id.taskMeta);
            edit = itemView.findViewById(R.id.btnEdit);
            delete = itemView.findViewById(R.id.btnDelete);
        }
    }

    public static class Task {
        public final String id;
        String text;
        LocalDate date;
        LocalTime time;
        LocalDateTime lastUpdated;

        Task(String id, String text, LocalDate date, LocalTime time, LocalDateTime lastUpdated) {
            this.id = id;
            this.text = text;
            this.date = date;
            this.time = time;
            this.lastUpdated = lastUpdated;
        }

        public String getText() {
            return text;
        }

        public LocalDate getDate() {
            return date;
        }

        public LocalTime getTime() {
            return time;
        }

        LocalDateTime getDueDateTime() {
            return LocalDateTime.of(date, time != null ? time : LocalTime.of(9, 0));
        }

        public int getReminderRequestCode(int offset) {
            return (id.hashCode() * 31) + offset;
        }
    }
}
