package com.mambesi.action.dispute;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
public interface CaseEventRepository extends JpaRepository<CaseEvent,UUID>{List<CaseEvent> findByOrderCaseIdOrderByRecordedAtAsc(UUID id);}
