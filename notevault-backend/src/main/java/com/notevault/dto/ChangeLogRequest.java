package com.notevault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ChangeLogRequest {
    @NotNull
    private LocalDate workDate;

    @NotBlank
    private String title;

    private String description;
    private String repositoryUrl;
    private String commitHash;

    private Long projectId;
    private Long milestoneId;
    private Long taskId;
}


