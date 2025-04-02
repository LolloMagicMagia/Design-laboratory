package com.example.bicoChat_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.example.bicoChat_backend.config.firebase",
		"com.example.bicoChat_backend.controller.firebase",
		"com.example.bicoChat_backend.service.firebase",
		"com.example.bicoChat_backend.controller.google",
		"com.example.bicoChat_backend.service.google"})
public class BicoChatBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BicoChatBackendApplication.class, args);

	}

}
