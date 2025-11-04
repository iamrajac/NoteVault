package com.notevault.repository;

import com.notevault.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByTeamLeadId(Long teamLeadId);
    List<Project> findByStatus(Project.Status status);
}
