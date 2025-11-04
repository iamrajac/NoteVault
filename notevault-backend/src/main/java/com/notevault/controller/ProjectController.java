package com.notevault.controller;

import com.notevault.dto.ProjectRequest;
import com.notevault.entity.Project;
import com.notevault.security.CustomUserDetails;
import com.notevault.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "http://localhost:3000")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<Project> createProject(
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(projectService.createProject(request, userDetails.getUser().getId()));
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails.getUser().getRole().name().equals("EMPLOYEE")) {
            return ResponseEntity.ok(projectService.getProjectsByTeamLead(
                userDetails.getUser().getTeamLead().getId()));
        }
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<List<Project>> getMyProjects(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(projectService.getProjectsByTeamLead(userDetails.getUser().getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<Project> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }
}
