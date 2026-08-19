package com.example.mistakenote.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 外部 API 调用服务实现
 * 封装 DeepSeek 与火山引擎 ARK 的 HTTP 调用细节，使用连接池管理的客户端
 */
@Service
@Slf4j
public class ExternalApiServiceImpl implements ExternalApiService {

    private final CloseableHttpClient httpClient;
    private final CloseableHttpClient longTimeoutHttpClient;
    private final ObjectMapper objectMapper;

    @Value("${ai.deepseek.api-key}")
    private String deepseekApiKey;

    @Value("${ai.deepseek.base-url}")
    private String deepseekBaseUrl;

    @Value("${ai.deepseek.model}")
    private String deepseekModel;

    @Value("${ai.ark.api-key}")
    private String arkApiKey;

    @Value("${ai.ark.base-url}")
    private String arkBaseUrl;

    @Value("${ai.ark.vision-model}")
    private String arkVisionModel;

    public ExternalApiServiceImpl(
            @Qualifier("httpClient") CloseableHttpClient httpClient,
            @Qualifier("longTimeoutHttpClient") CloseableHttpClient longTimeoutHttpClient) {
        this.httpClient = httpClient;
        this.longTimeoutHttpClient = longTimeoutHttpClient;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String callDeepSeekApi(String prompt, String systemPrompt) {
        String url = deepseekBaseUrl + "/chat/completions";

        Map<String, Object> body = new HashMap<>();
        body.put("model", deepseekModel);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", prompt));
        body.put("messages", messages);

        body.put("max_tokens", 2000);
        body.put("temperature", 0.7);

        String responseBody = executePost(url, body, deepseekApiKey, httpClient);

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("解析DeepSeek响应失败: {}", e.getMessage());
            throw new RuntimeException("AI服务响应解析失败");
        }
    }

    @Override
    public String callArkVisionApi(String imageDataUrl) {
        String url = arkBaseUrl + "/chat/completions";

        Map<String, Object> body = new HashMap<>();
        body.put("model", arkVisionModel);

        List<Map<String, Object>> content = new ArrayList<>();
        content.add(Map.of(
                "type", "image_url",
                "image_url", Map.of("url", imageDataUrl)
        ));
        content.add(Map.of(
                "type", "text",
                "text", "请识别图片中的所有题目。要求：1) 输出纯文本，不要使用LaTeX、Markdown或任何标记语言格式；2) 数学符号用普通字符表示，如集合用{1,2,3}而不是\\{1,2,3\\}，分数用a/b而不是\\frac{a}{b}；3) 如果图片中有多道题目，请将每道题分别识别出来；4) 只返回JSON数组格式，如[\"题目1内容\",\"题目2内容\"]，不要添加任何额外说明。"
        ));

        Map<String, Object> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", content);

        body.put("messages", List.of(userMessage));
        body.put("max_tokens", 4000);

        String responseBody = executePost(url, body, arkApiKey, longTimeoutHttpClient);
        log.info("ARK API响应: {}", responseBody.substring(0, Math.min(500, responseBody.length())));

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.path("choices");
            if (choices.isMissingNode() || !choices.isArray() || choices.isEmpty()) {
                String errorMsg = root.path("error").path("message").asText("");
                if (errorMsg.isEmpty()) {
                    errorMsg = root.path("error").asText("ARK API返回异常: " + responseBody.substring(0, Math.min(200, responseBody.length())));
                }
                log.error("ARK API返回错误: {}", errorMsg);
                throw new RuntimeException("图片识别失败: " + errorMsg);
            }

            String text = choices.get(0).path("message").path("content").asText("").trim();
            if (text.isEmpty()) {
                throw new RuntimeException("图片识别结果为空");
            }
            return text;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("解析ARK响应失败: {}", e.getMessage());
            throw new RuntimeException("图片识别服务响应解析失败");
        }
    }

    /**
     * 执行 POST 请求并返回响应体文本
     */
    private String executePost(String url, Object body, String apiKey, CloseableHttpClient client) {
        HttpPost request = new HttpPost(url);
        try {
            request.setEntity(new StringEntity(objectMapper.writeValueAsString(body), ContentType.APPLICATION_JSON));
            request.addHeader("Authorization", "Bearer " + apiKey);

            try (CloseableHttpResponse response = client.execute(request)) {
                String responseBody = new String(response.getEntity().getContent().readAllBytes(), StandardCharsets.UTF_8);
                return responseBody;
            }
        } catch (IOException e) {
            log.error("HTTP请求失败 [{}]: {}", url, e.getMessage());
            throw new RuntimeException("外部服务暂时不可用");
        }
    }
}
