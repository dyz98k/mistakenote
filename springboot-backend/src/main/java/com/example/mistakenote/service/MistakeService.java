package com.example.mistakenote.service;

import com.example.mistakenote.entity.Mistake;
import com.example.mistakenote.repository.MistakeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 错题服务类
 */
@Service
@RequiredArgsConstructor
public class MistakeService {

    private final MistakeRepository mistakeRepository;
    private final UserService userService;
    private final AiService aiService;

    public List<Mistake> getMistakesByUser(Long userId) {
        return mistakeRepository.findByUserId(userId);
    }

    public List<Mistake> getMistakesByUserAndSubject(Long userId, Long subjectId) {
        return mistakeRepository.findByUserIdAndSubjectId(userId, subjectId);
    }

    public Page<Mistake> getMistakesPage(Long userId, Long subjectId, String chapter, String keyword, Pageable pageable) {
        return mistakeRepository.searchMistakes(userId, subjectId, chapter, keyword, pageable);
    }

    public List<Mistake> getUnreviewedMistakes(Long userId) {
        return mistakeRepository.findByUserIdAndReviewed(userId, false);
    }

    public Mistake getMistakeById(Long userId, Long mistakeId) {
        Mistake mistake = mistakeRepository.findById(mistakeId)
                .orElseThrow(() -> new RuntimeException("错题不存在"));
        if (!mistake.getUserId().equals(userId)) {
            throw new RuntimeException("无权访问此错题");
        }
        return mistake;
    }

    @Transactional
    public Mistake createMistake(Long userId, Long subjectId, String question, String answer,
                                  String analysis, String tags, String imageUrl,
                                  String difficulty, String chapter) {
        // 业务验证：题目和图片不能同时为空
        boolean hasQuestion = question != null && !question.trim().isEmpty();
        boolean hasImage = imageUrl != null && !imageUrl.trim().isEmpty();
        if (!hasQuestion && !hasImage) {
            throw new IllegalArgumentException("题目和图片不能同时为空");
        }

        Mistake mistake = Mistake.builder()
                .userId(userId)
                .subjectId(subjectId)
                .question(question)
                .answer(answer)
                .analysis(analysis)
                .tags(tags)
                .imageUrl(imageUrl)
                .difficulty(difficulty != null ? difficulty : "中等")
                .chapter(chapter != null ? chapter : "未分类")
                .build();

        Mistake saved = mistakeRepository.save(mistake);

        userService.addPoints(userId, 10);

        return saved;
    }

    @Transactional
    public Mistake updateMistake(Long userId, Long mistakeId, Long subjectId, String question,
                                  String answer, String analysis, String tags, Boolean reviewed,
                                  String difficulty, String chapter, String imageUrl) {
        Mistake mistake = getMistakeById(userId, mistakeId);

        if (subjectId != null) mistake.setSubjectId(subjectId);
        if (question != null) mistake.setQuestion(question);
        if (answer != null) mistake.setAnswer(answer);
        if (analysis != null) mistake.setAnalysis(analysis);
        if (tags != null) mistake.setTags(tags);
        if (difficulty != null) mistake.setDifficulty(difficulty);
        if (chapter != null) mistake.setChapter(chapter);
        if (imageUrl != null) mistake.setImageUrl(imageUrl);
        if (reviewed != null) {
            mistake.setReviewed(reviewed);
            if (reviewed) {
                mistake.setReviewCount(mistake.getReviewCount() + 1);
                userService.addPoints(userId, 5);
            }
        }

        return mistakeRepository.save(mistake);
    }

    @Transactional
    public void deleteMistake(Long userId, Long mistakeId) {
        Mistake mistake = getMistakeById(userId, mistakeId);
        mistakeRepository.delete(mistake);
    }

    @Transactional
    public Mistake analyzeMistakeWithAI(Long userId, Long mistakeId) {
        Mistake mistake = getMistakeById(userId, mistakeId);

        // 如果题目内容为空且有图片，先自动OCR识别图片文字
        if ((mistake.getQuestion() == null || mistake.getQuestion().isBlank())
                && mistake.getImageUrl() != null && !mistake.getImageUrl().isBlank()) {
            String ocrText = aiService.recognizeTextFromImage(mistake.getImageUrl());
            mistake.setQuestion(ocrText);
        }

        if (mistake.getQuestion() == null || mistake.getQuestion().isBlank()) {
            throw new RuntimeException("题目内容为空，无法进行AI分析。请先输入题目或上传图片。");
        }

        String aiResult = aiService.analyzeMistake(
                mistake.getQuestion(),
                mistake.getAnswer() != null ? mistake.getAnswer() : "未提供答案",
                mistake.getAnalysis()
        );

        Map<String, String> analysisResult = aiService.parseAnalysisResult(aiResult);

        mistake.setErrorType(analysisResult.get("errorType"));
        mistake.setErrorPoint(analysisResult.get("errorPoint"));

        if (analysisResult.containsKey("improvedAnalysis")) {
            mistake.setAnalysis(analysisResult.get("improvedAnalysis"));
        }

        return mistakeRepository.save(mistake);
    }

    public List<Object[]> getErrorTypeStatistics(Long userId) {
        return mistakeRepository.countByErrorType(userId);
    }

    public List<Object[]> getErrorPointStatistics(Long userId) {
        return mistakeRepository.countByErrorPoint(userId);
    }

    public List<String> getDistinctErrorTypes(Long userId) {
        return mistakeRepository.findDistinctErrorTypes(userId);
    }

    public int getMistakeCount(Long userId) {
        return (int) mistakeRepository.countByUserId(userId);
    }

    public long getReviewedCount(Long userId) {
        return mistakeRepository.countByUserIdAndReviewed(userId, true);
    }

    public long getUnreviewedCount(Long userId) {
        return mistakeRepository.countByUserIdAndReviewed(userId, false);
    }

    public int getReviewCount(Long userId) {
        return mistakeRepository.sumReviewCountByUserId(userId);
    }
}
