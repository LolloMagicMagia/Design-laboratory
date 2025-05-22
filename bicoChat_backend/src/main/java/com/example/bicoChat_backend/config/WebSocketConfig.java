package com.example.bicoChat_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;

/**
 * WebSocket configuration class for enabling STOMP messaging with SockJS fallback.
 * This class configures the WebSocket endpoints, message brokers, and message converters.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Register the STOMP WebSocket endpoint.
     * The endpoint "/ws" will handle incoming WebSocket connections.
     * SockJS is enabled as a fallback option for browsers that do not support WebSockets.
     *
     * @param registry The registry for configuring the STOMP endpoint.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the WebSocket endpoint "/ws" with SockJS fallback for broader compatibility
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // Allow connections from all origins
                .withSockJS();  // Enable SockJS for browsers that do not support WebSockets
    }

    /**
     * Configure the message broker for handling messages.
     * - Enable a simple in-memory message broker for messages to the "/topic" destinations.
     * - Set "/app" as the prefix for application-level message destinations.
     *
     * @param registry The registry for configuring the message broker.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable a simple broker for message destinations prefixed with "/topic"
        registry.enableSimpleBroker("/topic");
        // Set "/app" as the prefix for messages destined for application-specific endpoints
        registry.setApplicationDestinationPrefixes("/app");
    }

    /**
     * Define a bean for the message converter to be used for converting messages
     * between the server and client in JSON format.
     *
     * @return A MappingJackson2MessageConverter bean for JSON message conversion.
     */
    @Bean
    public MappingJackson2MessageConverter messageConverter() {
        // Return a JSON message converter to serialize and deserialize messages in JSON format
        return new MappingJackson2MessageConverter();
    }
}
