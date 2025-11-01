package com.athena.greenbible.network;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class LeafApiClient {

    private static final String BASE_URL = "https://leaf-disease-api-v3fr.onrender.com/";

    private static LeafApi api;

    public static LeafApi getApi() {
        if (api == null) {
            synchronized (LeafApiClient.class) {
                if (api == null) {
                    HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
                    loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);

                    OkHttpClient client = new OkHttpClient.Builder()
                            .addInterceptor(loggingInterceptor)
                            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                            .build();

                    Retrofit retrofit = new Retrofit.Builder()
                            .baseUrl(BASE_URL)
                            .client(client)
                            .addConverterFactory(GsonConverterFactory.create())
                            .build();

                    api = retrofit.create(LeafApi.class);
                }
            }
        }
        return api;
    }
}
