package com.mambesi.action.message;

import com.mambesi.action.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public MessageResponse sendMessage(@RequestBody SendMessageRequest request) {
        String email = getEmail();
        Message message = messageService.sendMessage(email, request);
        return messageService.mapToResponse(message, email);
    }

    @GetMapping
    public List<MessageResponse> getThreads() {
        return messageService.getThreads(getEmail());
    }

    @GetMapping("/thread/{threadId}")
    public List<MessageResponse> getThread(@PathVariable String threadId) {
        return messageService.getThread(threadId, getEmail());
    }

    @GetMapping("/unread")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count",
                messageService.getUnreadCount(getEmail())));
    }

    private String getEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((User) auth.getPrincipal()).getEmail();
    }
}