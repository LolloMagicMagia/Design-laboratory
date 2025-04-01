package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.model.User;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    // Storage in-memory per gli utenti
    private final Map<String, User> users = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        // Inizializza alcuni utenti di esempio
        addUser(new User("1", "Marco Rossi", "online", "https://dummyimage.com/40x40/000/fff&text=M"));
        addUser(new User("2", "Laura Bianchi", "online", "/api/placeholder/40/40"));
        addUser(new User("3", "Francesca Verdi", "offline", "/api/placeholder/40/40"));
        addUser(new User("4", "Giulia Neri", "online", "/api/placeholder/40/40"));
        addUser(new User("5", "Andrea Ferretti", "offline", "/api/placeholder/40/40"));
        addUser(new User("currentUser", "Tu", "online", "https://dummyimage.com/40x40/000/fff&text=P"));
    }

    public void addUser(User user) {
        users.put(user.getId(), user);
    }

    public Optional<User> getUserById(String id) {
        return Optional.ofNullable(users.get(id));
    }

    public User getCurrentUser() {
        return users.getOrDefault("currentUser",
                new User("currentUser", "Tu", "online", "/api/placeholder/40/40"));
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    public void updateUserStatus(String userId, String status) {
        getUserById(userId).ifPresent(user -> {
            user.setStatus(status);
            users.put(userId, user);
        });
    }
}