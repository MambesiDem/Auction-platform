package com.mambesi.action.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class RenderKeepAlive {

    @Value("${app.base-url:}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // Ping self every 10 minutes to prevent Render free tier spin-down
    @Scheduled(fixedRate = 600000)
    public void keepAlive() {
        if (baseUrl != null && !baseUrl.isEmpty()) {
            try {
                restTemplate.getForObject(baseUrl + "/api/payments/health", String.class);
            } catch (Exception e) {
                System.out.println("Keep-alive failed: " + e.getMessage());
            }
        }
    }
}