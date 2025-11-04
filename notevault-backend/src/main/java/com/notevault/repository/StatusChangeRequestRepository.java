package com.notevault.repository;

import com.notevault.entity.StatusChangeRequest;
import com.notevault.entity.StatusChangeRequest.RequestStatus;
import com.notevault.entity.StatusChangeRequest.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StatusChangeRequestRepository extends JpaRepository<StatusChangeRequest, Long> {

    List<StatusChangeRequest> findByRequesterIdAndStatus(Long requesterId, RequestStatus status);

    @Query("select r from StatusChangeRequest r, Task t join t.milestone m join m.project p " +
           "where r.targetType = com.notevault.entity.StatusChangeRequest$TargetType.TASK " +
           "and r.status = com.notevault.entity.StatusChangeRequest$RequestStatus.PENDING " +
           "and t.id = r.targetId and p.teamLead.id = :teamLeadId")
    List<StatusChangeRequest> findPendingTaskRequestsForTeamLead(@Param("teamLeadId") Long teamLeadId);

    @Query("select r from StatusChangeRequest r, Project p " +
           "where r.targetType = com.notevault.entity.StatusChangeRequest$TargetType.PROJECT " +
           "and r.status = com.notevault.entity.StatusChangeRequest$RequestStatus.PENDING " +
           "and p.id = r.targetId and p.teamLead.id = :teamLeadId")
    List<StatusChangeRequest> findPendingProjectRequestsForTeamLead(@Param("teamLeadId") Long teamLeadId);
}


