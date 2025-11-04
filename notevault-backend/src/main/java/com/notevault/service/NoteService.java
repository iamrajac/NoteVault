package com.notevault.service;

import com.notevault.dto.NoteRequest;
import com.notevault.entity.Note;
import com.notevault.entity.Project;
import com.notevault.entity.Task;
import com.notevault.entity.User;
import com.notevault.repository.NoteRepository;
import com.notevault.repository.ProjectRepository;
import com.notevault.repository.TaskRepository;
import com.notevault.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NoteService {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    public Note createNote(NoteRequest request, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Note note = new Note();
        note.setContent(request.getContent());
        note.setCreatedBy(user);

        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new RuntimeException("Task not found"));
            note.setTask(task);
        }

        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));
            note.setProject(project);
        }

        return noteRepository.save(note);
    }

    public List<Note> getNotesByTask(Long taskId) {
        return noteRepository.findByTaskId(taskId);
    }

    public List<Note> getNotesByProject(Long projectId) {
        return noteRepository.findByProjectId(projectId);
    }

    public Note getNoteById(Long id) {
        return noteRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Note not found"));
    }

    public Note updateNote(Long id, NoteRequest request) {
        Note note = getNoteById(id);
        note.setContent(request.getContent());
        return noteRepository.save(note);
    }

    public void deleteNote(Long id) {
        noteRepository.deleteById(id);
    }
}
