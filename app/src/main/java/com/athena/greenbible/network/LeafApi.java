package com.athena.greenbible.network;

import com.athena.greenbible.network.model.PredictionResponse;

import okhttp3.MultipartBody;
import retrofit2.Call;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.Part;

public interface LeafApi {
    @Multipart
    @POST("/predict")
    Call<PredictionResponse> uploadLeaf(@Part MultipartBody.Part file);
}
