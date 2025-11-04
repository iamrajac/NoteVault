package com.notevault.repository;

import com.notevault.entity.ChangeLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ChangeLogEntryRepository extends JpaRepository<ChangeLogEntry, Long> {
    List<ChangeLogEntry> findByProjectIdOrderByWorkDateDesc(Long projectId);
    List<ChangeLogEntry> findByMilestoneIdOrderByWorkDateDesc(Long milestoneId);
    List<ChangeLogEntry> findByTaskIdOrderByWorkDateDesc(Long taskId);
    List<ChangeLogEntry> findByAuthorIdAndWorkDateBetweenOrderByWorkDateDesc(Long authorId, LocalDate start, LocalDate end);
}


