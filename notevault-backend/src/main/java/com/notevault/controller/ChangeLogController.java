package com.notevault.controller;

import com.notevault.dto.ChangeLogRequest;
import com.notevault.entity.ChangeLogEntry;
import com.notevault.security.CustomUserDetails;
import com.notevault.service.ChangeLogService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/changelog")
@CrossOrigin(origins = "http://localhost:3000")
public class ChangeLogController {

    @Autowired
    private ChangeLogService service;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChangeLogEntry> create(@AuthenticationPrincipal CustomUserDetails user,
                                                 @Valid @RequestBody ChangeLogRequest request) {
        return ResponseEntity.ok(service.create(user.getUser().getId(), request));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ChangeLogEntry>> byProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(service.getByProject(projectId));
    }

    @GetMapping("/milestone/{milestoneId}")
    public ResponseEntity<List<ChangeLogEntry>> byMilestone(@PathVariable Long milestoneId) {
        return ResponseEntity.ok(service.getByMilestone(milestoneId));
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<ChangeLogEntry>> byTask(@PathVariable Long taskId) {
        return ResponseEntity.ok(service.getByTask(taskId));
    }
}


