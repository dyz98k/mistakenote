package com.example.mistakenote.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "badge_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BadgeDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(length = 100)
    private String icon;

    @Column(name = "required_points")
    @Builder.Default
    private Integer requiredPoints = 0;

    @Column(name = "required_streak")
    @Builder.Default
    private Integer requiredStreak = 0;

    @Column(name = "required_mistakes")
    @Builder.Default
    private Integer requiredMistakes = 0;

    @Column(name = "required_reviews")
    @Builder.Default
    private Integer requiredReviews = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (requiredPoints == null) requiredPoints = 0;
        if (requiredStreak == null) requiredStreak = 0;
        if (requiredMistakes == null) requiredMistakes = 0;
        if (requiredReviews == null) requiredReviews = 0;
    }
}