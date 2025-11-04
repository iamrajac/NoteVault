package com.notevault.service;

import com.notevault.dto.MilestoneRequest;
import com.notevault.entity.Milestone;
import com.notevault.entity.Project;
import com.notevault.repository.MilestoneRepository;
import com.notevault.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MilestoneService {

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private ProjectRepository projectRepository;

    public Milestone createMilestone(MilestoneRequest request) {
        Project project = projectRepository.findById(request.getProjectId())
            .orElseThrow(() -> new RuntimeException("Project not found"));

        Milestone milestone = new Milestone();
        milestone.setName(request.getName());
        milestone.setDescription(request.getDescription());
        milestone.setProject(project);
        milestone.setDeadline(request.getDeadline());
        
        if (request.getStatus() != null) {
            milestone.setStatus(Milestone.Status.valueOf(request.getStatus()));
        }

        return milestoneRepository.save(milestone);
    }

    public List<Milestone> getAllMilestones() {
        return milestoneRepository.findAll();
    }

    public List<Milestone> getMilestonesByProject(Long projectId) {
        return milestoneRepository.findByProjectId(projectId);
    }

    public Milestone getMilestoneById(Long id) {
        return milestoneRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Milestone not found"));
    }

    public Milestone updateMilestone(Long id, MilestoneRequest request) {
        Milestone milestone = getMilestoneById(id);
        milestone.setName(request.getName());
        milestone.setDescription(request.getDescription());
        milestone.setDeadline(request.getDeadline());
        
        if (request.getStatus() != null) {
            milestone.setStatus(Milestone.Status.valueOf(request.getStatus()));
        }

        return milestoneRepository.save(milestone);
    }

    public void deleteMilestone(Long id) {
        milestoneRepository.deleteById(id);
    }
}
