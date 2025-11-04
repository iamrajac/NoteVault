package com.notevault.repository;

import com.notevault.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByMilestoneId(Long milestoneId);
    List<Task> findByAssignedToId(Long assignedToId);
    List<Task> findByStatus(Task.Status status);
}
