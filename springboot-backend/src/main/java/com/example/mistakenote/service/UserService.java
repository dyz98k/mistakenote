package com.example.mistakenote.service;

import com.example.mistakenote.entity.User;
import com.example.mistakenote.repository.UserRepository;
import com.example.mistakenote.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 用户服务类
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public User save(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public User register(String username, String password, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("用户名已存在");
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("邮箱已被注册");
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .email(email)
                .points(0)
                .streak(0)
                .build();

        return userRepository.save(user);
    }

    public Map<String, Object> login(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        updateActiveStatus(user.getId());

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());

        return Map.of(
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "email", user.getEmail(),
                        "phone", user.getPhone() == null ? "" : user.getPhone(),
                        "points", user.getPoints(),
                        "streak", user.getStreak()
                )
        );
    }

    /**
     * 修改密码：校验旧密码后更新为新密码
     */
    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("原密码错误");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("新密码至少6位");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void updateActiveStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        if (user.getLastActiveDate() != null) {
            LocalDate lastActiveDate = user.getLastActiveDate().toLocalDate();
            if (lastActiveDate.isEqual(today)) {
                user.setLastActiveDate(now);
                userRepository.save(user);
                return;
            } else if (lastActiveDate.plusDays(1).isEqual(today)) {
                user.setStreak(user.getStreak() + 1);
            } else {
                user.setStreak(1);
            }
        } else {
            user.setStreak(1);
        }

        user.setLastActiveDate(now);
        userRepository.save(user);
    }

    @Transactional
    public void addPoints(Long userId, int points) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setPoints(user.getPoints() + points);
        userRepository.save(user);
    }

    public List<User> getLeaderboard() {
        return userRepository.findTop10ByOrderByPointsDesc();
    }
}
