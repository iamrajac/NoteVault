package com.notevault.service;

import com.notevault.dto.TaskRequest;
import com.notevault.entity.Milestone;
import com.notevault.entity.Task;
import com.notevault.entity.User;
import com.notevault.repository.MilestoneRepository;
import com.notevault.repository.TaskRepository;
import com.notevault.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private UserRepository userRepository;

    public Task createTask(TaskRequest request) {
        Milestone milestone = milestoneRepository.findById(request.getMilestoneId())
            .orElseThrow(() -> new RuntimeException("Milestone not found"));

        User assignedTo = userRepository.findById(request.getAssignedToId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setMilestone(milestone);
        task.setAssignedTo(assignedTo);
        task.setDeadline(request.getDeadline());
        task.setPriority(request.getPriority() != null ? request.getPriority() : 1);
        
        if (request.getStatus() != null) {
            task.setStatus(Task.Status.valueOf(request.getStatus()));
        }

        return taskRepository.save(task);
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public List<Task> getTasksByMilestone(Long milestoneId) {
        return taskRepository.findByMilestoneId(milestoneId);
    }

    public List<Task> getTasksByUser(Long userId) {
        return taskRepository.findByAssignedToId(userId);
    }

    public Task getTaskById(Long id) {
        return taskRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Task not found"));
    }

    public Task updateTask(Long id, TaskRequest request) {
        Task task = getTaskById(id);
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDeadline(request.getDeadline());
        
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        
        if (request.getStatus() != null) {
            task.setStatus(Task.Status.valueOf(request.getStatus()));
        }

        return taskRepository.save(task);
    }

    public void deleteTask(Long id) {
        taskRepository.deleteById(id);
    }
}
