package com.example.mistakenote.repository;

import com.example.mistakenote.entity.Mistake;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 错题数据访问接口
 */
@Repository
public interface MistakeRepository extends JpaRepository<Mistake, Long> {

    @EntityGraph(attributePaths = "subject")
    List<Mistake> findByUserId(Long userId);

    @EntityGraph(attributePaths = "subject")
    List<Mistake> findByUserIdAndSubjectId(Long userId, Long subjectId);

    @EntityGraph(attributePaths = "subject")
    List<Mistake> findByUserIdAndReviewed(Long userId, Boolean reviewed);

    @EntityGraph(attributePaths = "subject")
    @Query("SELECT m FROM Mistake m WHERE m.userId = :userId ORDER BY m.createdAt DESC")
    List<Mistake> findRecentMistakes(@Param("userId") Long userId);

    @Query("SELECT m.errorType, COUNT(m) FROM Mistake m WHERE m.userId = :userId AND m.errorType IS NOT NULL GROUP BY m.errorType ORDER BY COUNT(m) DESC")
    List<Object[]> countByErrorType(@Param("userId") Long userId);

    @Query("SELECT m.errorPoint, COUNT(m) FROM Mistake m WHERE m.userId = :userId AND m.errorPoint IS NOT NULL GROUP BY m.errorPoint ORDER BY COUNT(m) DESC")
    List<Object[]> countByErrorPoint(@Param("userId") Long userId);

    @Query("SELECT DISTINCT m.errorType FROM Mistake m WHERE m.userId = :userId AND m.errorType IS NOT NULL")
    List<String> findDistinctErrorTypes(@Param("userId") Long userId);

    @Query("SELECT DISTINCT m.chapter FROM Mistake m WHERE m.userId = :userId AND m.subjectId = :subjectId AND m.chapter IS NOT NULL")
    List<String> findDistinctChaptersBySubject(@Param("userId") Long userId, @Param("subjectId") Long subjectId);

    @EntityGraph(attributePaths = "subject")
    List<Mistake> findByUserIdAndErrorType(Long userId, String errorType);

    long countByUserId(Long userId);

    long countByUserIdAndReviewed(Long userId, Boolean reviewed);

    @Query("SELECT COALESCE(SUM(m.reviewCount), 0) FROM Mistake m WHERE m.userId = :userId")
    int sumReviewCountByUserId(@Param("userId") Long userId);

    @EntityGraph(attributePaths = "subject")
    @Query(value = """
            SELECT m FROM Mistake m
            WHERE m.userId = :userId
              AND (:subjectId IS NULL OR m.subjectId = :subjectId)
              AND (:chapter IS NULL OR m.chapter = :chapter)
              AND (:keyword IS NULL
                   OR LOWER(m.question) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.chapter) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.subject.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY m.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM Mistake m
            WHERE m.userId = :userId
              AND (:subjectId IS NULL OR m.subjectId = :subjectId)
              AND (:chapter IS NULL OR m.chapter = :chapter)
              AND (:keyword IS NULL
                   OR LOWER(m.question) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.chapter) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(m.subject.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Mistake> searchMistakes(@Param("userId") Long userId,
                                 @Param("subjectId") Long subjectId,
                                 @Param("chapter") String chapter,
                                 @Param("keyword") String keyword,
                                 Pageable pageable);

    @Modifying
    @Query("UPDATE Mistake m SET m.subjectId = NULL WHERE m.subjectId = :subjectId")
    void unsetSubjectIdBySubjectId(@Param("subjectId") Long subjectId);
} 
