package com.notevault.controller;

import com.notevault.dto.MilestoneRequest;
import com.notevault.entity.Milestone;
import com.notevault.service.MilestoneService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/milestones")
@CrossOrigin(origins = "http://localhost:3000")
public class MilestoneController {

    @Autowired
    private MilestoneService milestoneService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<Milestone> createMilestone(@Valid @RequestBody MilestoneRequest request) {
        return ResponseEntity.ok(milestoneService.createMilestone(request));
    }

    @GetMapping
    public ResponseEntity<List<Milestone>> getAllMilestones() {
        return ResponseEntity.ok(milestoneService.getAllMilestones());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Milestone>> getMilestonesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(milestoneService.getMilestonesByProject(projectId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Milestone> getMilestoneById(@PathVariable Long id) {
        return ResponseEntity.ok(milestoneService.getMilestoneById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<Milestone> updateMilestone(
            @PathVariable Long id,
            @Valid @RequestBody MilestoneRequest request) {
        return ResponseEntity.ok(milestoneService.updateMilestone(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_TEAM_LEAD')")
    public ResponseEntity<Void> deleteMilestone(@PathVariable Long id) {
        milestoneService.deleteMilestone(id);
        return ResponseEntity.noContent().build();
    }
}
