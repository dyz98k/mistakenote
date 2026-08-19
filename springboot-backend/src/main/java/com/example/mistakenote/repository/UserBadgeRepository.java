package com.example.mistakenote.repository;

import com.example.mistakenote.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    List<UserBadge> findByUserId(Long userId);
    Optional<UserBadge> findByUserIdAndBadgeDefinitionId(Long userId, Long badgeDefinitionId);
    long countByUserIdAndUnlockedTrue(Long userId);
}