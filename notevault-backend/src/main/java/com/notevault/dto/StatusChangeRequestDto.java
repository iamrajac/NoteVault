package com.notevault.dto;

import lombok.Data;

@Data
public class StatusChangeRequestDto {
    private Long id;
    private String targetType; // TASK or PROJECT
    private Long targetId;
    private String requestedStatus;
    private String status; // PENDING/APPROVED/REJECTED
    private Long requesterId;
    private String requesterName;
}


