package com.notevault.controller;

import com.notevault.dto.UserRequest;
import com.notevault.dto.ChangePasswordRequest;
import com.notevault.dto.UserResponse;
import com.notevault.security.CustomUserDetails;
import com.notevault.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/admin/users/teamlead")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createTeamLead(@Valid @RequestBody UserRequest request) {
        request.setRole("TEAM_LEAD");
        return ResponseEntity.ok(userService.createUser(request));
    }

    @PostMapping("/teamlead/users/employee")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<UserResponse> createEmployee(
            @Valid @RequestBody UserRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        request.setRole("EMPLOYEE");
        request.setTeamLeadId(userDetails.getUser().getId());
        return ResponseEntity.ok(userService.createUser(request));
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/teamlead/employees")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEAM_LEAD')")
    public ResponseEntity<List<UserResponse>> getMyEmployees(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(userService.getUsersByTeamLead(userDetails.getUser().getId()));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/teamlead/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    public ResponseEntity<Void> deleteEmployeeAsTeamLead(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userService.deleteEmployeeAsTeamLead(id, userDetails.getUser().getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/change-password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userService.changePassword(userDetails.getUser().getId(), request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}
