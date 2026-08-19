package com.example.mistakenote.controller;

import com.example.mistakenote.entity.PracticeExercise;
import com.example.mistakenote.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI控制器
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/ask")
    public ResponseEntity<?> askQuestion(Authentication auth, @RequestBody Map<String, String> body) {
        Long userId = (Long) auth.getPrincipal();
        String question = body.get("question");
        
        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "请输入问题"));
        }

        try {
            String answer = aiService.askQuestion(question);
            return ResponseEntity.ok(Map.of("answer", answer, "source", "deepseek"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/generate-practice")
    public ResponseEntity<?> generatePractice(Authentication auth, @RequestBody Map<String, String> body) {
        Long userId = (Long) auth.getPrincipal();
        String errorType = body.get("errorType");
        String errorPoint = body.get("errorPoint");

        if (errorType == null || errorPoint == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少错误类型或错误点"));
        }

        try {
            List<PracticeExercise> exercises = aiService.generatePracticeExercises(userId, errorType, errorPoint);
            return ResponseEntity.ok(Map.of(
                    "message", "练习生成成功",
                    "exercises", exercises
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}