package com.example.mistakenote.service;

import com.example.mistakenote.entity.Chapter;
import com.example.mistakenote.repository.ChapterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;

    public List<String> getChapterNamesBySubject(Long subjectId) {
        return chapterRepository.findBySubjectId(subjectId)
                .stream()
                .map(Chapter::getName)
                .collect(Collectors.toList());
    }

    @Transactional
    public Chapter addChapter(Long subjectId, String chapterName) {
        return chapterRepository.findBySubjectIdAndName(subjectId, chapterName)
                .orElseGet(() -> chapterRepository.save(Chapter.builder()
                        .subjectId(subjectId)
                        .name(chapterName)
                        .build()));
    }

    @Transactional
    public void deleteChapter(Long subjectId, String chapterName) {
        chapterRepository.deleteBySubjectIdAndName(subjectId, chapterName);
    }
}