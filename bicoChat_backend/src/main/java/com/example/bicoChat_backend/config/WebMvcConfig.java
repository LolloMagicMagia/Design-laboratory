package com.example.bicoChat_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * WebMvcConfig class for configuring Cross-Origin Resource Sharing (CORS) settings for the application.
 * This configuration allows cross-origin requests to be made to the backend API.
 */
@Configuration
public class WebMvcConfig {

    /**
     * Configures CORS settings to allow requests from all origins and specific HTTP methods.
     *
     * @return A WebMvcConfigurer bean that configures the CORS mappings.
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            /**
             * Adds CORS mappings for the API to allow cross-origin requests.
             * The configuration allows all origins and specific HTTP methods.
             *
             * @param registry The CORS registry to add mappings to.
             */
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**") // Apply to all paths
                        .allowedOriginPatterns("*") // Allow all origins (this is the recommended method)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH") // Allow specific HTTP methods
                        .allowedHeaders("*") // Allow all headers
                        .allowCredentials(true); // Allow credentials (cookies, authorization headers, etc.)
            }
        };
    }
}
