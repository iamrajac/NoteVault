package com.notevault.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NoteRequest {
    @NotBlank
    private String content;
    
    private Long taskId;
    private Long projectId;
}
