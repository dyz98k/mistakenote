package com.example.mistakenote.repository;

import com.example.mistakenote.entity.PracticeExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 专项练习数据访问接口
 */
@Repository
public interface PracticeExerciseRepository extends JpaRepository<PracticeExercise, Long> {

    List<PracticeExercise> findByUserId(Long userId);

    List<PracticeExercise> findByUserIdAndErrorType(Long userId, String errorType);

    List<PracticeExercise> findByUserIdAndCompleted(Long userId, Boolean completed);

    List<PracticeExercise> findByUserIdAndErrorTypeAndCompleted(Long userId, String errorType, Boolean completed);
}