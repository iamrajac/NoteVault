package com.notevault.service;

import com.notevault.dto.ProjectRequest;
import com.notevault.entity.Project;
import com.notevault.entity.User;
import com.notevault.repository.ProjectRepository;
import com.notevault.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    public Project createProject(ProjectRequest request, Long teamLeadId) {
        User teamLead = userRepository.findById(teamLeadId)
            .orElseThrow(() -> new RuntimeException("Team lead not found"));

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setTeamLead(teamLead);
        
        if (request.getStatus() != null) {
            project.setStatus(Project.Status.valueOf(request.getStatus()));
        }

        return projectRepository.save(project);
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getProjectsByTeamLead(Long teamLeadId) {
        return projectRepository.findByTeamLeadId(teamLeadId);
    }

    public Project getProjectById(Long id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public Project updateProject(Long id, ProjectRequest request) {
        Project project = getProjectById(id);
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        
        if (request.getStatus() != null) {
            project.setStatus(Project.Status.valueOf(request.getStatus()));
        }

        return projectRepository.save(project);
    }

    public void deleteProject(Long id) {
        projectRepository.deleteById(id);
    }
}
