package com.mambesi.action.message;

public class SendMessageRequest {
    private String receiverEmail;
    private String subject;
    private String content;
    private String threadId;

    public String getReceiverEmail() { return receiverEmail; }
    public String getSubject() { return subject; }
    public String getContent() { return content; }
    public String getThreadId() { return threadId; }
}