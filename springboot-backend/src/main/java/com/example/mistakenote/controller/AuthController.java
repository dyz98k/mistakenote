package com.example.mistakenote.controller;

import com.example.mistakenote.entity.User;
import com.example.mistakenote.service.RewardService;
import com.example.mistakenote.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final RewardService rewardService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String email = body.get("email");

        if (username == null || password == null || email == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少必要参数"));
        }

        try {
            User user = userService.register(username, password, email);
            rewardService.initBadges(user.getId());
            return ResponseEntity.ok(Map.of(
                    "message", "注册成功",
                    "user", Map.of("id", user.getId(), "username", user.getUsername())
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少必要参数"));
        }

        try {
            Map<String, Object> result = userService.login(username, password);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userService.findById(userId).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "phone", user.getPhone() == null ? "" : user.getPhone(),
                "points", user.getPoints(),
                "streak", user.getStreak(),
                "createdAt", user.getCreatedAt()
        ));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(Authentication auth, @RequestBody Map<String, String> body) {
        Long userId = (Long) auth.getPrincipal();
        try {
            User user = userService.findById(userId).orElseThrow();
            String email = body.get("email");
            String phone = body.get("phone");

            if (email != null && !email.trim().isEmpty()) {
                user.setEmail(email.trim());
            }
            if (phone != null && !phone.trim().isEmpty()) {
                // 简单校验手机号格式
                String p = phone.trim();
                if (!p.matches("^1[3-9]\\d{9}$")) {
                    return ResponseEntity.badRequest().body(Map.of("message", "手机号格式不正确"));
                }
                user.setPhone(p);
            }
            userService.save(user);
            return ResponseEntity.ok(Map.of(
                    "message", "更新成功",
                    "email", user.getEmail(),
                    "phone", user.getPhone() == null ? "" : user.getPhone()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "更新失败: " + e.getMessage()));
        }
    }

    /**
     * 修改密码：需校验原密码
     */
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(Authentication auth, @RequestBody Map<String, String> body) {
        Long userId = (Long) auth.getPrincipal();
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少必要参数"));
        }
        try {
            userService.changePassword(userId, oldPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "密码修改成功"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}