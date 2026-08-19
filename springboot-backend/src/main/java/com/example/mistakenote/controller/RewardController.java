package com.example.mistakenote.controller;

import com.example.mistakenote.entity.Badge;
import com.example.mistakenote.entity.User;
import com.example.mistakenote.service.RewardService;
import com.example.mistakenote.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 奖励控制器
 */
@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;
    private final UserService userService;

    // 每日小游戏奖励：按用户+日期记录已发放经验，每日上限 16
    private static final int GAME_DAILY_CAP = 16;
    // key: userId + "_" + yyyy-MM-dd, value: 已发放经验
    private final Map<String, Integer> gameDailyAwarded = new ConcurrentHashMap<>();

    @GetMapping("/badges")
    public ResponseEntity<Map<String, Object>> getBadges(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(Map.of("data", rewardService.getBadgesByUser(userId)));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<Map<String, Object>> getLeaderboard(Authentication auth) {
        List<User> users = userService.getLeaderboard();
        List<? extends Map<String, Object>> leaderboard = users.stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "points", u.getPoints(),
                        "streak", u.getStreak()
                ))
                .toList();
        return ResponseEntity.ok(Map.of("data", leaderboard));
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userService.findById(userId).orElseThrow();
        
        int level = rewardService.calculateLevel(user.getPoints());
        String levelTitle = rewardService.getLevelTitle(level);
        
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "points", user.getPoints(),
                "level", level,
                "levelTitle", levelTitle,
                "streak", user.getStreak()
        ));
    }

    @GetMapping("/privileges")
    public ResponseEntity<List<Map<String, Object>>> getPrivileges(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userService.findById(userId).orElseThrow();
        int level = rewardService.calculateLevel(user.getPoints());
        
        List<Map<String, Object>> privileges = List.of(
                Map.of("id", 1, "name", "AI错题分析", "description", "使用AI分析错题原因", "icon", "🤖", "requiredLevel", 1, "unlocked", level >= 1),
                Map.of("id", 2, "name", "智能练习生成", "description", "根据错题自动生成练习题", "icon", "📝", "requiredLevel", 3, "unlocked", level >= 3),
                Map.of("id", 3, "name", "学习周报", "description", "每周学习报告总结", "icon", "📊", "requiredLevel", 5, "unlocked", level >= 5),
                Map.of("id", 4, "name", "专属徽章", "description", "解锁专属限定徽章", "icon", "🏆", "requiredLevel", 8, "unlocked", level >= 8),
                Map.of("id", 5, "name", "学习导师", "description", "一对一学习指导", "icon", "👨‍🏫", "requiredLevel", 10, "unlocked", level >= 10),
                Map.of("id", 6, "name", "至尊特权", "description", "所有功能全部解锁", "icon", "💎", "requiredLevel", 12, "unlocked", level >= 12)
        );

        return ResponseEntity.ok(privileges);
    }

    /**
     * 每日小游戏奖励发放
     * - 每日上限 16 经验
     * - 同一 userId 当日累计不超过上限
     */
    @PostMapping("/game-reward")
    public ResponseEntity<Map<String, Object>> awardGameReward(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        Long userId = (Long) auth.getPrincipal();
        User user = userService.findById(userId).orElseThrow();
        int level = rewardService.calculateLevel(user.getPoints());

        // 等级门槛：Lv.3 及以上
        if (level < 3) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "等级未达到 Lv.3，无法领取游戏奖励",
                    "awarded", 0
            ));
        }

        int requested;
        try {
            requested = Integer.parseInt(String.valueOf(body.get("points")));
        } catch (Exception e) {
            requested = 0;
        }
        if (requested <= 0) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "awarded", 0,
                    "totalToday", gameDailyAwarded.getOrDefault(todayKey(userId), 0)
            ));
        }

        String key = todayKey(userId);
        int already = gameDailyAwarded.getOrDefault(key, 0);
        int toAward = Math.min(requested, GAME_DAILY_CAP - already);
        if (toAward <= 0) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "awarded", 0,
                    "message", "今日游戏奖励已达上限",
                    "totalToday", already
            ));
        }

        userService.addPoints(userId, toAward);
        gameDailyAwarded.put(key, already + toAward);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "awarded", toAward,
                "totalToday", already + toAward,
                "dailyCap", GAME_DAILY_CAP
        ));
    }

    private String todayKey(Long userId) {
        return userId + "_" + LocalDate.now().toString();
    }
}