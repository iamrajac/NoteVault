package com.notevault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class TaskRequest {
    @NotBlank
    private String title;
    
    private String description;
    
    @NotNull
    private Long milestoneId;
    
    @NotNull
    private Long assignedToId;
    
    @NotNull
    private LocalDate deadline;
    
    private String status;
    private Integer priority;
}
