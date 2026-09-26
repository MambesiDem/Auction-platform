package com.mambesi.action.message;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByThreadIdOrderBySentAtAsc(String threadId);

    @Query("SELECT m FROM Message m WHERE " +
            "(m.sender.id = :userId OR m.receiver.id = :userId) " +
            "AND m.sentAt = (SELECT MAX(m2.sentAt) FROM Message m2 WHERE m2.threadId = m.threadId) " +
            "ORDER BY m.sentAt DESC")
    List<Message> findLatestMessagePerThread(@Param("userId") UUID userId);

    long countByReceiverIdAndReadFalse(UUID receiverId);

    List<Message> findByThreadIdAndReceiverIdAndReadFalse(String threadId, UUID receiverId);
}