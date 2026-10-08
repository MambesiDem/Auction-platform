package com.mambesi.action.message;

import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository,
                          UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    public Message sendMessage(String senderEmail, SendMessageRequest request) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findByEmail(request.getReceiverEmail())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        String threadId = generateThreadId(sender.getId(), receiver.getId());
        if (request.getThreadId() != null && !request.getThreadId().isBlank() && !threadId.equals(request.getThreadId()))
            throw new SecurityException("This thread does not belong to these participants.");
        if (sender.getId().equals(receiver.getId())) throw new IllegalArgumentException("Choose another recipient.");
        if (request.getContent() == null || request.getContent().isBlank() || request.getContent().length() > 5000)
            throw new IllegalArgumentException("Message must contain 1 to 5000 characters.");
        if (request.getSubject() != null && request.getSubject().length() > 200) throw new IllegalArgumentException("Subject is too long.");

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(request.getContent());
        message.setSubject(request.getSubject() != null
                ? request.getSubject() : "No subject");
        message.setThreadId(threadId);

        return messageRepository.save(message);
    }

    @Transactional(readOnly=true)
    public List<MessageResponse> getThreads(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return messageRepository.findLatestMessagePerThread(user.getId())
                .stream()
                .map(m -> mapToResponse(m, email))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<MessageResponse> getThread(String threadId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Message> thread = messageRepository.findByThreadIdOrderBySentAtAsc(threadId);
        if (thread.isEmpty()) return List.of();
        for (Message m : thread) {
            if (!m.getSender().getId().equals(user.getId()) && !m.getReceiver().getId().equals(user.getId()))
                throw new SecurityException("You are not a participant in this conversation.");
        }
        // Mark messages as read
        List<Message> unread = messageRepository
                .findByThreadIdAndReceiverIdAndReadFalse(threadId, user.getId());
        unread.forEach(m -> m.setRead(true));
        messageRepository.saveAll(unread);

        return thread.stream()
                .map(m -> mapToResponse(m, email))
                .collect(Collectors.toList());
    }

    public long getUnreadCount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return messageRepository.countByReceiverIdAndReadFalse(user.getId());
    }

    private String generateThreadId(UUID senderId, UUID receiverId) {
        String a = senderId.toString();
        String b = receiverId.toString();
        return a.compareTo(b) < 0 ? a + "_" + b : b + "_" + a;
    }

    @Transactional
    public MessageResponse mapToResponse(Message m, String currentEmail) {
        return new MessageResponse(
                m.getId(),
                m.getSender().getEmail(),
                m.getSender().getFullName(),
                m.getReceiver().getEmail(),
                m.getContent(),
                m.getSubject(),
                m.getThreadId(),
                m.isRead(),
                m.getSentAt(),
                m.getSender().getEmail().equals(currentEmail)
        );
    }
}