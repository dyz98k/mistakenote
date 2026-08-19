package com.example.mistakenote.service;

/**
 * 外部 API 调用服务接口
 * 封装所有对外部 AI 服务的 HTTP 调用，与业务逻辑解耦
 */
public interface ExternalApiService {

    /**
     * 调用 DeepSeek 文本对话 API
     *
     * @param prompt       用户提示词
     * @param systemPrompt 系统提示词（智能体角色设定）
     * @return AI 返回的文本内容
     */
    String callDeepSeekApi(String prompt, String systemPrompt);

    /**
     * 调用火山引擎 ARK 视觉模型 API，识别图片中的题目
     *
     * @param imageDataUrl Base64 格式的图片数据 URL
     * @return ARK API 返回的原始响应文本
     */
    String callArkVisionApi(String imageDataUrl);
}
