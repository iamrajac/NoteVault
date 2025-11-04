package com.notevault.controller;

import com.notevault.dto.NoteRequest;
import com.notevault.entity.Note;
import com.notevault.security.CustomUserDetails;
import com.notevault.service.NoteService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "http://localhost:3000")
public class NoteController {

    @Autowired
    private NoteService noteService;

    @PostMapping
    public ResponseEntity<Note> createNote(
            @Valid @RequestBody NoteRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(noteService.createNote(request, userDetails.getUser().getId()));
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<Note>> getNotesByTask(@PathVariable Long taskId) {
        return ResponseEntity.ok(noteService.getNotesByTask(taskId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Note>> getNotesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(noteService.getNotesByProject(projectId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Note> getNoteById(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.getNoteById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Note> updateNote(
            @PathVariable Long id,
            @Valid @RequestBody NoteRequest request) {
        return ResponseEntity.ok(noteService.updateNote(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        noteService.deleteNote(id);
        return ResponseEntity.noContent().build();
    }
}
