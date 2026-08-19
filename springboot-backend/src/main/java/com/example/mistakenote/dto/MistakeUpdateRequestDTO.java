package com.example.mistakenote.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MistakeUpdateRequestDTO {

    private Long subjectId;

    @Size(max = 5000, message = "题目长度不能超过5000字符")
    private String question;

    @Size(max = 5000, message = "答案长度不能超过5000字符")
    private String answer;

    @Size(max = 5000, message = "解析长度不能超过5000字符")
    private String analysis;

    @Size(max = 200, message = "标签长度不能超过200字符")
    private String tags;

    private Boolean reviewed;

    @Size(max = 50, message = "难度长度不能超过50字符")
    private String difficulty;

    @Size(max = 100, message = "章节长度不能超过100字符")
    private String chapter;

    private String imageUrl;
}