package com.example.bicoChat_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {
		"com.example.bicoChat_backend",                    // include tutto
		"com.example.bicoChat_backend.config",
		"com.example.bicoChat_backend.config.firebase",
		"com.example.bicoChat_backend.controller",
		"com.example.bicoChat_backend.controller.user",
		"com.example.bicoChat_backend.service",
		"com.example.bicoChat_backend.service.user",
})
public class BicoChatBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BicoChatBackendApplication.class, args);
	}
}
