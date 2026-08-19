package com.example.mistakenote.repository;

import com.example.mistakenote.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    List<Chapter> findBySubjectId(Long subjectId);
    Optional<Chapter> findBySubjectIdAndName(Long subjectId, String name);
    void deleteBySubjectIdAndName(Long subjectId, String name);
}