package com.notevault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class MilestoneRequest {
    @NotBlank
    private String name;
    
    private String description;
    
    @NotNull
    private Long projectId;
    
    @NotNull
    private LocalDate deadline;
    
    private String status;
}
