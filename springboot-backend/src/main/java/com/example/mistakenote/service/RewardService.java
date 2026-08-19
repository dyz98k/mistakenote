package com.example.mistakenote.service;

import com.example.mistakenote.entity.Badge;
import com.example.mistakenote.entity.BadgeDefinition;
import com.example.mistakenote.entity.User;
import com.example.mistakenote.entity.UserBadge;
import com.example.mistakenote.repository.BadgeDefinitionRepository;
import com.example.mistakenote.repository.BadgeRepository;
import com.example.mistakenote.repository.UserBadgeRepository;
import com.example.mistakenote.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RewardService {

    private final BadgeRepository badgeRepository;
    private final BadgeDefinitionRepository badgeDefinitionRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final MistakeService mistakeService;

    @Transactional
    public void initBadgeDefinitions() {
        if (badgeDefinitionRepository.count() == 0) {
            List<BadgeDefinition> definitions = new ArrayList<>();
            
            definitions.add(BadgeDefinition.builder().name("坚持不懈").description("连续打卡3天").icon("🔥").requiredPoints(0).requiredStreak(3).requiredMistakes(0).requiredReviews(0).build());
            definitions.add(BadgeDefinition.builder().name("一周达人").description("连续打卡7天").icon("⭐").requiredPoints(0).requiredStreak(7).requiredMistakes(0).requiredReviews(0).build());
            definitions.add(BadgeDefinition.builder().name("月冠军").description("连续打卡30天").icon("👑").requiredPoints(0).requiredStreak(30).requiredMistakes(0).requiredReviews(0).build());
            definitions.add(BadgeDefinition.builder().name("错题新手").description("添加1道错题").icon("📝").requiredPoints(0).requiredStreak(0).requiredMistakes(1).requiredReviews(0).build());
            definitions.add(BadgeDefinition.builder().name("错题能手").description("添加50道错题").icon("📚").requiredPoints(0).requiredStreak(0).requiredMistakes(50).requiredReviews(0).build());
            definitions.add(BadgeDefinition.builder().name("错题大师").description("添加100道错题").icon("🎯").requiredPoints(0).requiredStreak(0).requiredMistakes(100).requiredReviews(0).build());
            definitions.add(BadgeDefinition.builder().name("勤学好问").description("复习10次").icon("🔄").requiredPoints(0).requiredStreak(0).requiredMistakes(0).requiredReviews(10).build());
            definitions.add(BadgeDefinition.builder().name("学霸养成").description("复习50次").icon("💯").requiredPoints(0).requiredStreak(0).requiredMistakes(0).requiredReviews(50).build());
            
            badgeDefinitionRepository.saveAll(definitions);
        }
    }

    @Transactional
    public void initUserBadges(Long userId) {
        if (userBadgeRepository.findByUserId(userId).isEmpty()) {
            List<BadgeDefinition> definitions = badgeDefinitionRepository.findAll();
            List<UserBadge> userBadges = new ArrayList<>();
            
            for (BadgeDefinition definition : definitions) {
                userBadges.add(UserBadge.builder()
                        .userId(userId)
                        .badgeDefinitionId(definition.getId())
                        .unlocked(false)
                        .progress(0)
                        .build());
            }
            
            userBadgeRepository.saveAll(userBadges);
        }
    }

    public List<Badge> getBadgesByUser(Long userId) {
        List<UserBadge> userBadges = userBadgeRepository.findByUserId(userId);
        if (userBadges.isEmpty()) {
            initBadges(userId);
            userBadges = userBadgeRepository.findByUserId(userId);
        }
        
        Map<Long, BadgeDefinition> definitions = badgeDefinitionRepository.findAll()
                .stream()
                .collect(Collectors.toMap(BadgeDefinition::getId, d -> d));
        
        return userBadges.stream()
                .map(ub -> {
                    BadgeDefinition def = definitions.get(ub.getBadgeDefinitionId());
                    return Badge.builder()
                            .id(ub.getId())
                            .userId(ub.getUserId())
                            .name(def != null ? def.getName() : "")
                            .icon(def != null ? def.getIcon() : "")
                            .description(def != null ? def.getDescription() : "")
                            .progress(ub.getProgress())
                            .threshold(def != null ? Math.max(def.getRequiredPoints(), Math.max(def.getRequiredStreak(), Math.max(def.getRequiredMistakes(), def.getRequiredReviews()))) : 0)
                            .unlocked(ub.getUnlocked())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void checkAndUpdateBadges(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        int mistakeCount = mistakeService.getMistakeCount(userId);
        int reviewCount = mistakeService.getReviewCount(userId);
        
        List<UserBadge> userBadges = userBadgeRepository.findByUserId(userId);
        Map<Long, BadgeDefinition> definitions = badgeDefinitionRepository.findAll()
                .stream()
                .collect(Collectors.toMap(BadgeDefinition::getId, d -> d));
        
        for (UserBadge userBadge : userBadges) {
            BadgeDefinition def = definitions.get(userBadge.getBadgeDefinitionId());
            if (def == null) continue;
            
            int currentProgress = 0;
            if (def.getRequiredPoints() > 0) currentProgress = user.getPoints();
            else if (def.getRequiredStreak() > 0) currentProgress = user.getStreak();
            else if (def.getRequiredMistakes() > 0) currentProgress = mistakeCount;
            else if (def.getRequiredReviews() > 0) currentProgress = reviewCount;
            
            int threshold = Math.max(def.getRequiredPoints(), Math.max(def.getRequiredStreak(), Math.max(def.getRequiredMistakes(), def.getRequiredReviews())));
            
            userBadge.setProgress(Math.min(currentProgress, threshold));
            
            if (currentProgress >= threshold && !userBadge.getUnlocked()) {
                userBadge.setUnlocked(true);
                userBadge.setEarnedAt(LocalDateTime.now());
            }
            
            userBadgeRepository.save(userBadge);
        }
    }

    public int calculateLevel(int points) {
        if (points < 100) return 1;
        if (points < 250) return 2;
        if (points < 500) return 3;
        if (points < 1000) return 4;
        if (points < 2000) return 5;
        if (points < 4000) return 6;
        if (points < 7000) return 7;
        if (points < 11000) return 8;
        if (points < 16000) return 9;
        if (points < 22000) return 10;
        if (points < 30000) return 11;
        return 12;
    }

    public String getLevelTitle(int level) {
        String[] titles = {"新手", "入门", "进阶", "熟练", "精通", "大师", "专家", "学霸", "学神", "宗师", "传奇", "至尊"};
        return titles[Math.min(level - 1, titles.length - 1)];
    }

    @Transactional
    public void initBadges(Long userId) {
        initBadgeDefinitions();
        initUserBadges(userId);
    }
}