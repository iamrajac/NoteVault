package com.notevault.controller;

import com.notevault.entity.Project;
import com.notevault.entity.Task;
import com.notevault.repository.MilestoneRepository;
import com.notevault.repository.ProjectRepository;
import com.notevault.repository.TaskRepository;
import com.notevault.repository.UserRepository;
import com.notevault.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "http://localhost:3000")
public class DashboardController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> stats = new HashMap<>();

        String role = userDetails.getUser().getRole().name();
        Long userId = userDetails.getUser().getId();

        if (role.equals("ADMIN")) {
            stats.put("totalProjects", projectRepository.count());
            stats.put("totalMilestones", milestoneRepository.count());
            stats.put("totalTasks", taskRepository.count());
            stats.put("totalUsers", userRepository.count());
        } else if (role.equals("TEAM_LEAD")) {
            List<Project> projects = projectRepository.findByTeamLeadId(userId);
            long milestones = projects.stream()
                .mapToLong(p -> milestoneRepository.findByProjectId(p.getId()).size())
                .sum();
            long tasks = milestoneRepository.findAll().stream()
                .filter(m -> projects.stream().anyMatch(p -> p.getId().equals(m.getProject().getId())))
                .mapToLong(m -> taskRepository.findByMilestoneId(m.getId()).size())
                .sum();

            stats.put("totalProjects", projects.size());
            stats.put("totalMilestones", milestones);
            stats.put("totalTasks", tasks);
            stats.put("totalEmployees", userRepository.findByTeamLeadId(userId).size());
        } else { // EMPLOYEE
            List<Task> tasks = taskRepository.findByAssignedToId(userId);
            long completedTasks = tasks.stream().filter(t -> t.getStatus() == Task.Status.COMPLETED).count();
            
            stats.put("totalTasks", tasks.size());
            stats.put("completedTasks", completedTasks);
            stats.put("todoTasks", tasks.stream().filter(t -> t.getStatus() == Task.Status.TODO).count());
            stats.put("inProgressTasks", tasks.stream().filter(t -> t.getStatus() == Task.Status.IN_PROGRESS).count());
        }

        return ResponseEntity.ok(stats);
    }
}
