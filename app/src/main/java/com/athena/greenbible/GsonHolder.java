package com.athena.greenbible;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.Map;

public class GsonHolder {
    private static final Gson GSON = new Gson();
    public static final Type TYPE_MAP_STRING_DOUBLE = new TypeToken<Map<String, Double>>(){}.getType();

    private GsonHolder() {}

    public static Gson get() {
        return GSON;
    }
}
