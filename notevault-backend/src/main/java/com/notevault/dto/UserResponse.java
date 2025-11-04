package com.notevault.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private Long teamLeadId;
    private String teamLeadName;
    private Boolean active;
    private LocalDateTime createdAt;
}
