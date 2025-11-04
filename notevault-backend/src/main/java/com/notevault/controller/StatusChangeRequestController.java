package com.notevault.controller;

import com.notevault.dto.StatusChangeRequestDto;
import com.notevault.security.CustomUserDetails;
import com.notevault.service.StatusChangeRequestService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class StatusChangeRequestController {

    @Autowired
    private StatusChangeRequestService service;

    @PostMapping("/requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StatusChangeRequestDto> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        String targetType = String.valueOf(payload.get("targetType"));
        Long targetId = Long.valueOf(String.valueOf(payload.get("targetId")));
        String requestedStatus = String.valueOf(payload.get("requestedStatus"));
        return ResponseEntity.ok(service.createRequest(userDetails.getUser().getId(), targetType, targetId, requestedStatus));
    }

    @GetMapping("/teamlead/requests")
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    public ResponseEntity<List<StatusChangeRequestDto>> pendingForTeamLead(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(service.getPendingForTeamLead(userDetails.getUser().getId()));
    }

    @PostMapping("/teamlead/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    public ResponseEntity<Void> approve(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        service.approve(id, userDetails.getUser().getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/teamlead/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    public ResponseEntity<Void> reject(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        service.reject(id, userDetails.getUser().getId());
        return ResponseEntity.noContent().build();
    }
}


