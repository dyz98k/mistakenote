package com.example.mistakenote.service;

import com.example.mistakenote.entity.PracticeExercise;
import com.example.mistakenote.repository.PracticeExerciseRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI服务类 - 核心创新功能
 * 专注于业务逻辑：prompt 构建、结果解析与数据持久化
 * HTTP 调用细节委托给 {@link ExternalApiService}
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    private final PracticeExerciseRepository practiceExerciseRepository;
    private final ExternalApiService externalApiService;
    private final ObjectMapper objectMapper;

    /**
     * AI智能体配置
     */
    private enum AgentType {
        LEARNING_ASSISTANT("学习助手", "🤖", "你是一个专业的学习助手，擅长解答各类学科问题，帮助学生理解知识点。请用中文回答，语言通俗易懂。"),
        MATH_TUTOR("数学导师", "📐", "你是一位资深数学老师，擅长高中数学教学。请详细讲解数学题，包括解题思路、公式推导和易错点。"),
        PHYSICS_TUTOR("物理导师", "⚡", "你是一位物理专家，擅长高中物理教学。请用通俗的语言解释物理概念，详细分析物理题的解题步骤。"),
        ENGLISH_TUTOR("英语导师", "📚", "你是一位英语老师，擅长语法讲解和作文批改。请详细分析英语语法，给出实用的学习建议。"),
        WRITING_ASSISTANT("作文助手", "📝", "你是一位语文老师，擅长作文批改和润色。请给出具体的修改建议和优秀范文参考。"),
        MISTAKE_ANALYZER("错题分析师", "🧠", "你是一位错题分析专家，擅长识别错误类型、分析错误原因，并提供针对性的改进建议。"),
        STUDY_PLANNER("学习规划师", "📅", "你是一位学习规划专家，擅长根据学生的错题情况制定个性化学习计划和复习安排。");

        private final String name;
        private final String icon;
        private final String systemPrompt;

        AgentType(String name, String icon, String systemPrompt) {
            this.name = name;
            this.icon = icon;
            this.systemPrompt = systemPrompt;
        }

        public String getName() { return name; }
        public String getIcon() { return icon; }
        public String getSystemPrompt() { return systemPrompt; }

        public static AgentType fromName(String name) {
            for (AgentType type : values()) {
                if (type.name.equals(name)) {
                    return type;
                }
            }
            return LEARNING_ASSISTANT;
        }
    }
    /**
     * 调用DeepSeek API（指定智能体）
     */
    private String callDeepSeek(String prompt, AgentType agentType) {
        return externalApiService.callDeepSeekApi(prompt, agentType.getSystemPrompt());
    }

    /**
     * 调用DeepSeek API（默认智能体）
     */
    private String callDeepSeek(String prompt) {
        return callDeepSeek(prompt, AgentType.LEARNING_ASSISTANT);
    }

    /**
     * 分析错题 - 识别错误类型和错误点
     */
    public String analyzeMistake(String question, String answer, String analysis) {
        String prompt = String.format("""
                请分析这道错题，识别错误类型和错误点：
                
                题目：%s
                学生答案：%s
                现有分析：%s
                
                请返回JSON格式：
                {
                  "errorType": "错误类型（如：概念误解、计算错误、审题不清、公式记错等）",
                  "errorPoint": "具体错误点（详细描述）",
                  "improvedAnalysis": "改进后的详细分析"
                }
                """, question, answer, analysis != null ? analysis : "无");

        return callDeepSeek(prompt);
    }

    /**
     * 解析AI分析结果
     */
    public Map<String, String> parseAnalysisResult(String aiResult) {
        Map<String, String> result = new HashMap<>();
        
        try {
            aiResult = cleanJsonString(aiResult);
            JsonNode root = objectMapper.readTree(aiResult);
            result.put("errorType", root.path("errorType").asText("未分类"));
            result.put("errorPoint", root.path("errorPoint").asText("未识别"));
            result.put("improvedAnalysis", root.path("improvedAnalysis").asText());
        } catch (JsonProcessingException e) {
            log.warn("解析AI分析结果失败，使用原始文本");
            result.put("errorType", "分析完成");
            result.put("errorPoint", aiResult.substring(0, Math.min(100, aiResult.length())));
            result.put("improvedAnalysis", aiResult);
        }
        
        return result;
    }

    /**
     * 清理JSON字符串
     */
    private String cleanJsonString(String json) {
        json = json.trim();
        if (json.startsWith("```")) {
            json = json.substring(json.indexOf("\n") + 1);
        }
        if (json.endsWith("```")) {
            json = json.substring(0, json.lastIndexOf("\n"));
        }
        return json.trim();
    }

    /**
     * 生成专项练习 - 创新点核心功能
     */
    @Transactional
    public List<PracticeExercise> generatePracticeExercises(Long userId, String errorType, String errorPoint) {
        String prompt = String.format("""
                根据以下错误点生成3道专项练习题：
                
                错误类型：%s
                错误点：%s
                
                请严格返回JSON格式，包含3道题目：
                {
                  "exercises": [
                    {
                      "question": "题目内容",
                      "options": "A.选项1\\nB.选项2\\nC.选项3\\nD.选项4",
                      "answer": "正确答案（如：A）",
                      "analysis": "详细解析"
                    },
                    {
                      "question": "题目内容",
                      "options": "A.选项1\\nB.选项2\\nC.选项3\\nD.选项4",
                      "answer": "正确答案",
                      "analysis": "详细解析"
                    },
                    {
                      "question": "题目内容",
                      "options": "A.选项1\\nB.选项2\\nC.选项3\\nD.选项4",
                      "answer": "正确答案",
                      "analysis": "详细解析"
                    }
                  ]
                }
                
                题目难度要与错误点匹配，帮助学生针对性练习。
                """, errorType, errorPoint);

        String aiResult = callDeepSeek(prompt);
        
        List<PracticeExercise> exercises = new ArrayList<>();
        
        try {
            aiResult = cleanJsonString(aiResult);
            JsonNode root = objectMapper.readTree(aiResult);
            JsonNode exercisesNode = root.path("exercises");
            
            if (exercisesNode.isArray()) {
                int index = 1;
                for (JsonNode exerciseNode : exercisesNode) {
                    PracticeExercise exercise = PracticeExercise.builder()
                            .userId(userId)
                            .errorType(errorType)
                            .errorPoint(errorPoint)
                            .questionNo(index++)
                            .question(exerciseNode.path("question").asText())
                            .options(exerciseNode.path("options").asText())
                            .answer(exerciseNode.path("answer").asText())
                            .analysis(exerciseNode.path("analysis").asText())
                            .completed(false)
                            .correct(false)
                            .build();
                    exercises.add(practiceExerciseRepository.save(exercise));
                }
            }
        } catch (JsonProcessingException e) {
            log.error("解析练习生成结果失败: {}", e.getMessage());
            throw new RuntimeException("练习生成失败，请重试");
        }

        return exercises;
    }

    /**
     * 获取用户的专项练习
     */
    public List<PracticeExercise> getPracticeExercises(Long userId) {
        return practiceExerciseRepository.findByUserId(userId);
    }

    /**
     * 获取指定错误类型的练习
     */
    public List<PracticeExercise> getPracticeExercisesByErrorType(Long userId, String errorType) {
        return practiceExerciseRepository.findByUserIdAndErrorType(userId, errorType);
    }

    /**
     * 获取未完成的练习
     */
    public List<PracticeExercise> getUncompletedExercises(Long userId) {
        return practiceExerciseRepository.findByUserIdAndCompleted(userId, false);
    }

    /**
     * 提交练习答案
     */
    @Transactional
    public PracticeExercise submitExercise(Long userId, Long exerciseId, String userAnswer) {
        PracticeExercise exercise = practiceExerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new RuntimeException("练习不存在"));
        
        if (!exercise.getUserId().equals(userId)) {
            throw new RuntimeException("无权访问此练习");
        }

        exercise.setUserAnswer(userAnswer);
        exercise.setCompleted(true);
        
        String correctAnswer = exercise.getAnswer().trim().toUpperCase();
        String submittedAnswer = userAnswer.trim().toUpperCase();
        
        exercise.setCorrect(submittedAnswer.equals(correctAnswer));
        
        return practiceExerciseRepository.save(exercise);
    }

    /**
     * 回答问题
     */
    public String askQuestion(String question) {
        String prompt = String.format("""
                你是一个专业的学习助手，请回答以下问题：

                %s

                要求：
                1) 提供详细、清晰的解答
                2) 输出纯文本，不要使用任何 Markdown 或标记语言格式
                3) 不要使用 ** 加粗、### 标题、- 列表符号、* 星号、# 井号等符号
                4) 用普通文字和数字编号组织内容，如"1. "、"2. "，或直接用换行分段
                5) 数学符号用普通字符，如 a/b、{1,2,3}、<=、>= 等
                6) 排列整齐，层次分明，每段开头直接是文字内容
                """, question);

        return cleanMarkdown(callDeepSeek(prompt));
    }

    /**
     * 清理 Markdown 格式符号，转为纯文本
     */
    private String cleanMarkdown(String text) {
        if (text == null || text.isEmpty()) return text;
        // 去掉代码块标记
        text = text.replaceAll("```[\\s\\S]*?\\n", "");
        text = text.replaceAll("```", "");
        // 去掉行首的标题符号 # ## ### 等
        text = text.replaceAll("(?m)^#{1,6}\\s*", "");
        // 去掉加粗/斜体符号 ** * __ _
        text = text.replaceAll("\\*\\*(.+?)\\*\\*", "$1");
        text = text.replaceAll("(?<!\\*)\\*(?!\\*)", "");
        text = text.replaceAll("__(.+?)__", "$1");
        // 去掉行首列表符号 - * + ·
        text = text.replaceAll("(?m)^\\s*[-*+·]\\s+", "");
        // 去掉行首数字列表符号后的点（保留 "1. " 格式）
        // 去掉引用符号 >
        text = text.replaceAll("(?m)^>\\s*", "");
        // 去掉行内代码 `code`
        text = text.replaceAll("`([^`]+)`", "$1");
        // 合并多个空行为最多两个换行
        text = text.replaceAll("\\n{3,}", "\n\n");
        return text.trim();
    }

    /**
     * 回答问题（指定智能体）
     */
    public String askQuestion(String question, String agentName) {
        AgentType agentType = AgentType.fromName(agentName);
        
        String prompt = String.format("""
                %s
                
                请提供详细、清晰的解答。
                """, question);

        return callDeepSeek(prompt, agentType);
    }

    /**
     * 获取所有智能体列表
     */
    public List<Map<String, String>> getAgents() {
        List<Map<String, String>> agents = new ArrayList<>();
        for (AgentType type : AgentType.values()) {
            agents.add(Map.of(
                    "name", type.getName(),
                    "icon", type.getIcon()
            ));
        }
        return agents;
    }

    /**
     * 自动分类题目 - 识别学科、知识点（章节）、难度
     * 返回 Map: { subjectName, chapter, difficulty }
     * difficulty 取值：简单、中等、困难
     */
    public Map<String, String> classifyQuestion(String question) {
        String prompt = String.format("""
                请根据以下题目内容，判断它属于哪个学科、哪个知识点（章节）以及难度。

                题目：%s

                要求：
                1) 学科只能从以下选项中选择一个：高等数学、线性代数、概率论、大学物理、英语、计算机、离散数学、化学、生物学、其他
                2) 知识点（章节）用简短的中文描述，如"极限与连续"、"矩阵运算"、"集合论"、"牛顿运动定律"等，不超过10个字
                3) 难度只能从以下三个选项中选择一个：简单、中等、困难（根据题目涉及的 Concept 数量、计算复杂度、推理深度综合判断）
                4) 只返回JSON格式，不要任何额外说明：
                {"subjectName":"学科名","chapter":"知识点","difficulty":"难度"}
                """, question);

        String aiResult = callDeepSeek(prompt);
        Map<String, String> result = new HashMap<>();
        try {
            aiResult = cleanJsonString(aiResult);
            JsonNode root = objectMapper.readTree(aiResult);
            result.put("subjectName", root.path("subjectName").asText("其他").trim());
            result.put("chapter", root.path("chapter").asText("未分类").trim());
            String diff = root.path("difficulty").asText("中等").trim();
            if (!diff.equals("简单") && !diff.equals("中等") && !diff.equals("困难")) {
                diff = "中等";
            }
            result.put("difficulty", diff);
        } catch (JsonProcessingException e) {
            log.warn("分类结果解析失败: {}", e.getMessage());
            result.put("subjectName", "其他");
            result.put("chapter", "未分类");
            result.put("difficulty", "中等");
        }
        return result;
    }

    /**
     * 图片文字识别（OCR）- 使用火山引擎 ARK 视觉模型
     */
    public String recognizeTextFromImage(String imageDataUrl) {
        return recognizeQuestionsFromImage(imageDataUrl).stream()
                .reduce((a, b) -> a + "\n\n" + b)
                .orElse("");
    }

    /**
     * 图片文字识别（OCR）- 识别多个题目，返回题目列表
     */
    public List<String> recognizeQuestionsFromImage(String imageDataUrl) {
        String text = externalApiService.callArkVisionApi(imageDataUrl);
        return parseQuestions(text);
    }

    /**
     * 解析多题结果，兼容JSON数组和纯文本
     */
    private List<String> parseQuestions(String text) {
        text = text.trim();
        // 尝试解析JSON数组
        if (text.startsWith("[")) {
            try {
                String json = cleanJsonString(text);
                JsonNode arr = objectMapper.readTree(json);
                List<String> questions = new ArrayList<>();
                if (arr.isArray()) {
                    for (JsonNode node : arr) {
                        String q = node.asText("").trim();
                        if (!q.isEmpty()) questions.add(q);
                    }
                    if (!questions.isEmpty()) return questions;
                }
            } catch (Exception e) {
                log.warn("JSON数组解析失败，按文本分隔处理");
            }
        }
        // 兜底：按双换行或题号分隔
        List<String> questions = new ArrayList<>();
        String[] parts = text.split("\n\s*\n");
        for (String part : parts) {
            String q = part.trim();
            if (!q.isEmpty()) questions.add(q);
        }
        return questions.isEmpty() ? List.of(text) : questions;
    }
}