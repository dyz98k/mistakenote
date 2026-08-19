package com.example.mistakenote.controller;

import com.example.mistakenote.dto.MistakeCreateRequestDTO;
import com.example.mistakenote.dto.MistakeUpdateRequestDTO;
import com.example.mistakenote.entity.Mistake;
import com.example.mistakenote.service.AiService;
import com.example.mistakenote.service.MistakeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 错题控制器
 */
@RestController
@RequestMapping("/api/mistakes")
@RequiredArgsConstructor
public class MistakeController {

    private final MistakeService mistakeService;
    private final AiService aiService;

    @GetMapping
    public ResponseEntity<?> getMistakes(Authentication auth,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) String chapter,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer size) {
        Long userId = (Long) auth.getPrincipal();

        // 不传 size 时保持原有行为：一次返回全部（前端首页统计需要全量数据）
        if (size == null) {
            List<Mistake> mistakes;
            if (subjectId != null) {
                mistakes = mistakeService.getMistakesByUserAndSubject(userId, subjectId);
            } else {
                mistakes = mistakeService.getMistakesByUser(userId);
            }
            return ResponseEntity.ok(mistakes);
        }

        String ch = (chapter == null || chapter.isBlank()) ? null : chapter.trim();
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        Page<Mistake> result = mistakeService.getMistakesPage(userId, subjectId, ch, kw, PageRequest.of(page, size));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/unreviewed")
    public ResponseEntity<List<Mistake>> getUnreviewedMistakes(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(mistakeService.getUnreviewedMistakes(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Mistake> getMistakeById(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(mistakeService.getMistakeById(userId, id));
    }

    @PostMapping
    public ResponseEntity<Mistake> createMistake(Authentication auth, 
            @Valid @RequestBody MistakeCreateRequestDTO request) {
        Long userId = (Long) auth.getPrincipal();
        
        Mistake mistake = mistakeService.createMistake(
            userId, 
            request.getSubjectId(), 
            request.getQuestion(), 
            request.getAnswer(), 
            request.getAnalysis(), 
            request.getTags(), 
            request.getImageUrl(), 
            request.getDifficulty(), 
            request.getChapter()
        );
        
        return ResponseEntity.ok(mistake);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Mistake> updateMistake(Authentication auth, @PathVariable Long id, 
            @Valid @RequestBody MistakeUpdateRequestDTO request) {
        Long userId = (Long) auth.getPrincipal();
        
        Mistake mistake = mistakeService.updateMistake(
            userId, 
            id, 
            request.getSubjectId(), 
            request.getQuestion(), 
            request.getAnswer(), 
            request.getAnalysis(), 
            request.getTags(), 
            request.getReviewed(), 
            request.getDifficulty(), 
            request.getChapter(), 
            request.getImageUrl()
        );
        
        return ResponseEntity.ok(mistake);
    }

    @PostMapping("/ocr")
    public ResponseEntity<?> recognizeText(Authentication auth, @RequestBody Map<String, String> body) {
        String image = body.get("image");
        if (image == null || image.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少图片数据"));
        }
        try {
            List<String> questions = aiService.recognizeQuestionsFromImage(image);
            // 拼接文本，兼容旧前端逻辑
            String text = questions.stream().reduce((a, b) -> a + "\n\n" + b).orElse("");
            return ResponseEntity.ok(Map.of(
                    "text", text,
                    "questions", questions
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/classify")
    public ResponseEntity<?> classifyQuestion(Authentication auth, @RequestBody Map<String, String> body) {
        String question = body.get("question");
        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少题目内容"));
        }
        try {
            Map<String, String> result = aiService.classifyQuestion(question);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMistake(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        mistakeService.deleteMistake(userId, id);
        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<?> analyzeMistake(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        
        try {
            Mistake mistake = mistakeService.analyzeMistakeWithAI(userId, id);
            return ResponseEntity.ok(Map.of(
                    "message", "分析完成",
                    "mistake", mistake,
                    "errorType", mistake.getErrorType(),
                    "errorPoint", mistake.getErrorPoint()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/statistics/error-types")
    public ResponseEntity<?> getErrorTypeStatistics(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        List<Object[]> stats = mistakeService.getErrorTypeStatistics(userId);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/distinct-error-types")
    public ResponseEntity<List<String>> getDistinctErrorTypes(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(mistakeService.getDistinctErrorTypes(userId));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<?> reviewMistake(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        
        try {
            Mistake mistake = mistakeService.updateMistake(userId, id, null, null, null, null, null, true, null, null, null);
            return ResponseEntity.ok(Map.of(
                    "message", "复习完成",
                    "mistake", mistake
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/review/stats")
    public ResponseEntity<Map<String, Object>> getReviewStats(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();

        int totalCount = mistakeService.getMistakeCount(userId);
        long reviewedCount = mistakeService.getReviewedCount(userId);
        long unreviewedCount = mistakeService.getUnreviewedCount(userId);
        int reviewCount = mistakeService.getReviewCount(userId);

        return ResponseEntity.ok(Map.of(
                "totalCount", totalCount,
                "reviewedCount", reviewedCount,
                "unreviewedCount", unreviewedCount,
                "totalReviewTimes", reviewCount,
                "reviewRate", totalCount > 0 ? (double) reviewedCount / totalCount * 100 : 0
        ));
    }
}
