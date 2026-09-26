package com.mambesi.action.message;

import java.time.LocalDateTime;
import java.util.UUID;

public class MessageResponse {
    private UUID id;
    private String senderEmail;
    private String senderName;
    private String receiverEmail;
    private String content;
    private String subject;
    private String threadId;
    private boolean read;
    private LocalDateTime sentAt;
    private boolean mine;

    public MessageResponse(UUID id, String senderEmail, String senderName,
                           String receiverEmail, String content, String subject,
                           String threadId, boolean read, LocalDateTime sentAt,
                           boolean mine) {
        this.id = id;
        this.senderEmail = senderEmail;
        this.senderName = senderName;
        this.receiverEmail = receiverEmail;
        this.content = content;
        this.subject = subject;
        this.threadId = threadId;
        this.read = read;
        this.sentAt = sentAt;
        this.mine = mine;
    }

    public UUID getId() { return id; }
    public String getSenderEmail() { return senderEmail; }
    public String getSenderName() { return senderName; }
    public String getReceiverEmail() { return receiverEmail; }
    public String getContent() { return content; }
    public String getSubject() { return subject; }
    public String getThreadId() { return threadId; }
    public boolean isRead() { return read; }
    public LocalDateTime getSentAt() { return sentAt; }
    public boolean isMine() { return mine; }
}