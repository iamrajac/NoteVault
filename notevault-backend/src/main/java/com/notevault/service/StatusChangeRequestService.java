package com.notevault.service;

import com.notevault.dto.StatusChangeRequestDto;
import com.notevault.entity.*;
import com.notevault.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StatusChangeRequestService {

    @Autowired
    private StatusChangeRequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    public StatusChangeRequestDto createRequest(Long requesterId, String targetType, Long targetId, String requestedStatus) {
        User requester = userRepository.findById(requesterId).orElseThrow(() -> new RuntimeException("User not found"));

        StatusChangeRequest req = new StatusChangeRequest();
        req.setRequester(requester);
        req.setTargetType(StatusChangeRequest.TargetType.valueOf(targetType));
        req.setTargetId(targetId);
        req.setRequestedStatus(requestedStatus);
        req.setStatus(StatusChangeRequest.RequestStatus.PENDING);
        StatusChangeRequest saved = requestRepository.save(req);
        return toDto(saved);
    }

    public List<StatusChangeRequestDto> getPendingForTeamLead(Long teamLeadId) {
        List<StatusChangeRequest> list = new ArrayList<>();
        list.addAll(requestRepository.findPendingTaskRequestsForTeamLead(teamLeadId));
        list.addAll(requestRepository.findPendingProjectRequestsForTeamLead(teamLeadId));
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    public void approve(Long requestId, Long approverId) {
        StatusChangeRequest req = requestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("Request not found"));
        User approver = userRepository.findById(approverId).orElseThrow(() -> new RuntimeException("Approver not found"));
        if (req.getStatus() != StatusChangeRequest.RequestStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }
        if (req.getTargetType() == StatusChangeRequest.TargetType.TASK) {
            Task task = taskRepository.findById(req.getTargetId()).orElseThrow(() -> new RuntimeException("Task not found"));
            task.setStatus(Task.Status.valueOf(req.getRequestedStatus()));
            taskRepository.save(task);
            // Recompute milestone and project statuses based on all child items
            recomputeMilestoneAndProject(task);
        } else {
            Project project = projectRepository.findById(req.getTargetId()).orElseThrow(() -> new RuntimeException("Project not found"));
            project.setStatus(Project.Status.valueOf(req.getRequestedStatus()));
            projectRepository.save(project);
        }
        req.setApprover(approver);
        req.setStatus(StatusChangeRequest.RequestStatus.APPROVED);
        requestRepository.save(req);
    }

    public void reject(Long requestId, Long approverId) {
        StatusChangeRequest req = requestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("Request not found"));
        User approver = userRepository.findById(approverId).orElseThrow(() -> new RuntimeException("Approver not found"));
        if (req.getStatus() != StatusChangeRequest.RequestStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }
        req.setApprover(approver);
        req.setStatus(StatusChangeRequest.RequestStatus.REJECTED);
        requestRepository.save(req);
    }

    private StatusChangeRequestDto toDto(StatusChangeRequest r) {
        StatusChangeRequestDto dto = new StatusChangeRequestDto();
        dto.setId(r.getId());
        dto.setTargetType(r.getTargetType().name());
        dto.setTargetId(r.getTargetId());
        dto.setRequestedStatus(r.getRequestedStatus());
        dto.setStatus(r.getStatus().name());
        dto.setRequesterId(r.getRequester().getId());
        dto.setRequesterName(r.getRequester().getFullName());
        return dto;
    }

    private void recomputeMilestoneAndProject(Task task) {
        if (task.getMilestone() == null) return;
        Long milestoneId = task.getMilestone().getId();
        var tasks = taskRepository.findByMilestoneId(milestoneId);
        Milestone.Status newMilestoneStatus = deriveMilestoneStatus(tasks, task.getMilestone());
        Milestone milestone = milestoneRepository.findById(milestoneId).orElse(null);
        if (milestone != null && newMilestoneStatus != milestone.getStatus()) {
            milestone.setStatus(newMilestoneStatus);
            milestoneRepository.save(milestone);
        }
        if (milestone != null && milestone.getProject() != null) {
            Long projectId = milestone.getProject().getId();
            var milestones = milestoneRepository.findByProjectId(projectId);
            Project.Status newProjectStatus = deriveProjectStatus(milestones);
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project != null && newProjectStatus != project.getStatus()) {
                project.setStatus(newProjectStatus);
                projectRepository.save(project);
            }
        }
    }

    private Milestone.Status deriveMilestoneStatus(List<Task> tasks, Milestone milestone) {
        if (tasks.isEmpty()) return Milestone.Status.NOT_STARTED;
        boolean allTodo = true;
        boolean allCompleted = true;
        for (Task t : tasks) {
            if (t.getStatus() != Task.Status.TODO) {
                allTodo = false;
            }
            if (t.getStatus() != Task.Status.COMPLETED) {
                allCompleted = false;
            }
        }
        if (allCompleted) return Milestone.Status.COMPLETED;
        if (allTodo) return Milestone.Status.NOT_STARTED;
        // delayed if past deadline and some remain
        try {
            if (milestone.getDeadline() != null && milestone.getDeadline().isBefore(java.time.LocalDate.now())) {
                return Milestone.Status.DELAYED;
            }
        } catch (Exception ignored) {}
        return Milestone.Status.IN_PROGRESS;
    }

    private Project.Status deriveProjectStatus(List<Milestone> milestones) {
        if (milestones.isEmpty()) return Project.Status.ACTIVE;
        boolean allCompleted = true;
        boolean allNotStarted = true;
        for (Milestone m : milestones) {
            if (m.getStatus() != Milestone.Status.COMPLETED) {
                allCompleted = false;
            }
            if (m.getStatus() != Milestone.Status.NOT_STARTED) {
                allNotStarted = false;
            }
        }
        if (allCompleted) return Project.Status.COMPLETED;
        if (allNotStarted) return Project.Status.ON_HOLD; // interpret as not kicked off
        return Project.Status.ACTIVE;
    }
}


