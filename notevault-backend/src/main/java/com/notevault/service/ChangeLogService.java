package com.notevault.service;

import com.notevault.dto.ChangeLogRequest;
import com.notevault.entity.ChangeLogEntry;
import com.notevault.entity.Milestone;
import com.notevault.entity.Project;
import com.notevault.entity.Task;
import com.notevault.entity.User;
import com.notevault.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChangeLogService {

    @Autowired
    private ChangeLogEntryRepository repo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private TaskRepository taskRepository;

    public ChangeLogEntry create(Long authorId, ChangeLogRequest request) {
        User author = userRepository.findById(authorId).orElseThrow(() -> new RuntimeException("User not found"));
        ChangeLogEntry e = new ChangeLogEntry();
        e.setAuthor(author);
        e.setWorkDate(request.getWorkDate());
        e.setTitle(request.getTitle());
        e.setDescription(request.getDescription());
        e.setRepositoryUrl(request.getRepositoryUrl());
        e.setCommitHash(request.getCommitHash());
        if (request.getProjectId() != null) {
            Project p = projectRepository.findById(request.getProjectId()).orElseThrow(() -> new RuntimeException("Project not found"));
            e.setProject(p);
        }
        if (request.getMilestoneId() != null) {
            Milestone m = milestoneRepository.findById(request.getMilestoneId()).orElseThrow(() -> new RuntimeException("Milestone not found"));
            e.setMilestone(m);
        }
        if (request.getTaskId() != null) {
            Task t = taskRepository.findById(request.getTaskId()).orElseThrow(() -> new RuntimeException("Task not found"));
            e.setTask(t);
        }
        return repo.save(e);
    }

    public List<ChangeLogEntry> getByProject(Long projectId) {
        return repo.findByProjectIdOrderByWorkDateDesc(projectId);
    }

    public List<ChangeLogEntry> getByMilestone(Long milestoneId) {
        return repo.findByMilestoneIdOrderByWorkDateDesc(milestoneId);
    }

    public List<ChangeLogEntry> getByTask(Long taskId) {
        return repo.findByTaskIdOrderByWorkDateDesc(taskId);
    }
}


