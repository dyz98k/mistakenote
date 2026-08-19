package com.example.mistakenote.config;

import com.example.mistakenote.service.SubjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * 数据初始化组件
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final SubjectService subjectService;

    @Override
    public void run(String... args) throws Exception {
        log.info("初始化默认科目数据...");
        subjectService.initDefaultSubjects();
        log.info("默认科目初始化完成");
    }
}