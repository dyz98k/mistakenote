package com.example.mistakenote.service;

import com.example.mistakenote.entity.Subject;
import com.example.mistakenote.repository.MistakeRepository;
import com.example.mistakenote.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 科目服务类
 */
@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final MistakeRepository mistakeRepository;

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    public Subject getSubjectById(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("科目不存在"));
    }

    public Subject createSubject(String name, String icon) {
        Subject subject = Subject.builder()
                .name(name)
                .icon(icon)
                .build();
        return subjectRepository.save(subject);
    }

    public Subject updateSubject(Long id, String name, String icon) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("科目不存在"));
        if (name != null) subject.setName(name);
        if (icon != null) subject.setIcon(icon);
        return subjectRepository.save(subject);
    }

    @Transactional
    public void deleteSubject(Long id) {
        mistakeRepository.unsetSubjectIdBySubjectId(id);
        subjectRepository.deleteById(id);
    }

    public void initDefaultSubjects() {
        if (subjectRepository.count() == 0) {
            subjectRepository.save(Subject.builder().name("高等数学").icon("📐").build());
            subjectRepository.save(Subject.builder().name("线性代数").icon("📊").build());
            subjectRepository.save(Subject.builder().name("概率论").icon("🎲").build());
            subjectRepository.save(Subject.builder().name("大学物理").icon("⚛️").build());
            subjectRepository.save(Subject.builder().name("英语").icon("📚").build());
            subjectRepository.save(Subject.builder().name("计算机").icon("💻").build());
        }
    }
}