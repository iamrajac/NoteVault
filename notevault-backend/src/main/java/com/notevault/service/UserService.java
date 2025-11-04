package com.notevault.service;

import com.notevault.dto.UserRequest;
import com.notevault.dto.UserResponse;
import com.notevault.entity.User;
import com.notevault.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(User.Role.valueOf(request.getRole()));
        user.setActive(true);

        if (request.getTeamLeadId() != null) {
            User teamLead = userRepository.findById(request.getTeamLeadId())
                .orElseThrow(() -> new RuntimeException("Team lead not found"));
            user.setTeamLead(teamLead);
        }

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    public List<UserResponse> getUsersByTeamLead(Long teamLeadId) {
        return userRepository.findByTeamLeadId(teamLeadId).stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToResponse(user);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public void deleteEmployeeAsTeamLead(Long employeeId, Long teamLeadId) {
        User employee = userRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (employee.getTeamLead() == null || !employee.getTeamLead().getId().equals(teamLeadId)) {
            throw new RuntimeException("Not authorized to delete this user");
        }
        userRepository.deleteById(employeeId);
    }

    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private UserResponse mapToResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setRole(user.getRole().name());
        response.setActive(user.getActive());
        response.setCreatedAt(user.getCreatedAt());
        if (user.getTeamLead() != null) {
            response.setTeamLeadId(user.getTeamLead().getId());
            response.setTeamLeadName(user.getTeamLead().getFullName());
        }
        return response;
    }
}
