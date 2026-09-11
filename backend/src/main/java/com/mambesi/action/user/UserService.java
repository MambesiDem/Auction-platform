package com.mambesi.action.user;

import com.mambesi.action.security.JwtService;
import com.mambesi.action.user.dto.LoginResponse;
import com.mambesi.action.user.dto.UserResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public User registerUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public LoginResponse login(String email, String rawPassword) {
        User existingUser = findByEmail(email);

        if (existingUser != null && passwordEncoder.matches(rawPassword, existingUser.getPassword())) {
            String token = jwtService.generateToken(existingUser.getEmail());
            if (existingUser.isBanned()) {
                throw new RuntimeException("Your account has been suspended.");
            }
            return new LoginResponse(
                    token,
                    existingUser.getId(),
                    existingUser.getFullName(),
                    existingUser.getEmail(),
                    existingUser.getRole()
            );
        }
        throw new RuntimeException("Invalid email or password");
    }
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(u -> new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.isBanned()))
                .collect(java.util.stream.Collectors.toList());
    }

    public UserResponse setBanStatus(UUID id, boolean banned) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setBanned(banned);
        User saved = userRepository.save(user);
        return new UserResponse(saved.getId(), saved.getFullName(), saved.getEmail(), saved.getRole(), saved.isBanned());
    }

    public UserResponse createAdmin(String fullName, String email, String password) {
        System.out.println("Creating admin: " + email);

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already in use.");
        }

        User admin = new User();
        admin.setFullName(fullName);
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);

        User saved = userRepository.save(admin);
        System.out.println("Admin created: " + saved.getId());

        return new UserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getRole(),
                saved.isBanned()
        );
    }
}