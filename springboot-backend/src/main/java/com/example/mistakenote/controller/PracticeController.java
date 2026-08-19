package com.example.mistakenote.controller;

import com.example.mistakenote.entity.PracticeExercise;
import com.example.mistakenote.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 专项练习控制器
 */
@RestController
@RequestMapping("/api/practice")
@RequiredArgsConstructor
public class PracticeController {

    private final AiService aiService;

    @GetMapping
    public ResponseEntity<List<PracticeExercise>> getPracticeExercises(Authentication auth,
            @RequestParam(required = false) String errorType,
            @RequestParam(required = false) Boolean completed) {
        Long userId = (Long) auth.getPrincipal();
        
        List<PracticeExercise> exercises;
        if (errorType != null && completed != null) {
            exercises = aiService.getPracticeExercisesByErrorType(userId, errorType);
        } else if (completed != null) {
            exercises = aiService.getUncompletedExercises(userId);
        } else {
            exercises = aiService.getPracticeExercises(userId);
        }
        
        return ResponseEntity.ok(exercises);
    }

    @GetMapping("/uncompleted")
    public ResponseEntity<List<PracticeExercise>> getUncompletedExercises(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(aiService.getUncompletedExercises(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PracticeExercise> getPracticeExerciseById(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        PracticeExercise exercise = aiService.getPracticeExercises(userId).stream()
                .filter(e -> e.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("练习不存在"));
        return ResponseEntity.ok(exercise);
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<?> submitExercise(Authentication auth, @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        Long userId = (Long) auth.getPrincipal();
        String userAnswer = body.get("answer");
        
        if (userAnswer == null || userAnswer.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "请输入答案"));
        }

        try {
            PracticeExercise exercise = aiService.submitExercise(userId, id, userAnswer);
            return ResponseEntity.ok(java.util.Map.of(
                    "message", exercise.getCorrect() ? "回答正确！" : "回答错误",
                    "exercise", exercise,
                    "correct", exercise.getCorrect()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}