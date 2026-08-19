package com.example.mistakenote.repository;

import com.example.mistakenote.entity.BadgeDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BadgeDefinitionRepository extends JpaRepository<BadgeDefinition, Long> {
    Optional<BadgeDefinition> findByName(String name);
}