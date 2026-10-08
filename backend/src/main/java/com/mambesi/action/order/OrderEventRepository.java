package com.mambesi.action.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
public interface OrderEventRepository extends JpaRepository<OrderEvent,UUID> {
    List<OrderEvent> findByOrderIdOrderByRecordedAtAsc(UUID id);
}
