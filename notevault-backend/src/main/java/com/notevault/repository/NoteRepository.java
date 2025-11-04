package com.notevault.repository;

import com.notevault.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByTaskId(Long taskId);
    List<Note> findByProjectId(Long projectId);
    List<Note> findByCreatedById(Long createdById);
}
