package com.example.mistakenote.controller;

import com.example.mistakenote.entity.Chapter;
import com.example.mistakenote.entity.Subject;
import com.example.mistakenote.repository.MistakeRepository;
import com.example.mistakenote.service.ChapterService;
import com.example.mistakenote.service.SubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;
    private final ChapterService chapterService;
    private final MistakeRepository mistakeRepository;

    @GetMapping
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(subjectService.getAllSubjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subject> getSubjectById(@PathVariable Long id) {
        return ResponseEntity.ok(subjectService.getSubjectById(id));
    }

    @GetMapping("/{id}/chapters")
    public ResponseEntity<List<String>> getChaptersBySubject(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        List<String> chapters = chapterService.getChapterNamesBySubject(id);
        if (chapters.isEmpty()) {
            chapters = mistakeRepository.findDistinctChaptersBySubject(userId, id);
        }
        return ResponseEntity.ok(chapters);
    }

    @PostMapping("/{id}/chapters")
    public ResponseEntity<?> addChapter(Authentication auth, @PathVariable Long id, @RequestBody Map<String, String> body) {
        String chapter = body.get("chapter");
        Chapter saved = chapterService.addChapter(id, chapter);
        return ResponseEntity.ok(Map.of("message", "章节已添加", "chapter", saved.getName()));
    }

    @DeleteMapping("/{id}/chapters/{chapter}")
    public ResponseEntity<?> deleteChapter(Authentication auth, @PathVariable Long id, @PathVariable String chapter) {
        chapterService.deleteChapter(id, chapter);
        return ResponseEntity.ok(Map.of("message", "章节已删除"));
    }

    @PostMapping
    public ResponseEntity<?> createSubject(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String icon = body.get("icon");
        
        Subject subject = subjectService.createSubject(name, icon);
        return ResponseEntity.ok(subject);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSubject(Authentication auth, @PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = (Long) auth.getPrincipal();
        String name = body.get("name");
        String icon = body.get("icon");
        
        Subject subject = subjectService.updateSubject(id, name, icon);
        return ResponseEntity.ok(subject);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSubject(Authentication auth, @PathVariable Long id) {
        Long userId = (Long) auth.getPrincipal();
        subjectService.deleteSubject(id);
        return ResponseEntity.ok(Map.of("message", "删除成功"));
    }
}