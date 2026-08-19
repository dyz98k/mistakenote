package com.example.mistakenote.repository;

import com.example.mistakenote.entity.Badge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 徽章数据访问接口
 */
@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {

    List<Badge> findByUserId(Long userId);

    List<Badge> findByUserIdAndUnlocked(Long userId, Boolean unlocked);
}