package com.example.mistakenote.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 专项练习实体类
 */
@Entity
@Table(name = "practice_exercises", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_error_type", columnList = "error_type"),
    @Index(name = "idx_completed", columnList = "completed")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PracticeExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "error_type", nullable = false, length = 100)
    private String errorType;

    @Column(name = "error_point", length = 200)
    private String errorPoint;

    @Column(name = "question_no", nullable = false)
    private Integer questionNo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(columnDefinition = "TEXT")
    private String options;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    @Column(nullable = false)
    @Builder.Default
    private Boolean completed = false;

    @Column(name = "user_answer", columnDefinition = "TEXT")
    private String userAnswer;

    @Column(nullable = false)
    @Builder.Default
    private Boolean correct = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (completed == null) completed = false;
        if (correct == null) correct = false;
    }
}