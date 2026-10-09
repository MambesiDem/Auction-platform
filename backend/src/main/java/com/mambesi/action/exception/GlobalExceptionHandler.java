package com.mambesi.action.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

//This class only handles exceptions thrown AFTER authentication.
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Handles all general RuntimeExceptions (auction not found, invalid bid, etc.)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(
            RuntimeException ex,
            HttpServletRequest request) {

        if ("/api/payments/notify".equals(request.getRequestURI())) {
            Throwable cause = ex;

            // Find the underlying parsing error without logging the payment payload.
            for (int depth = 0;
                 depth < 10 && cause.getCause() != null
                         && cause.getCause() != cause;
                 depth++) {
                cause = cause.getCause();
            }

            log.warn(
                    "Payfast ITN rejected: exceptionType={}, contentType={}, "
                            + "contentLength={}, rootCauseType={}, rootCauseMessage={}",
                    ex.getClass().getSimpleName(),
                    request.getContentType(),
                    request.getContentLengthLong(),
                    cause.getClass().getSimpleName(),
                    cause.getMessage()
            );
        }

        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now().toString());
        error.put("status", HttpStatus.BAD_REQUEST.value());
        error.put("error", "Bad Request");
        error.put("message", ex.getMessage());
        error.put("path", request.getRequestURI());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Handles @Valid validation failures
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        Map<String, Object> errors = new HashMap<>();
        errors.put("timestamp", LocalDateTime.now().toString());
        errors.put("status", HttpStatus.UNPROCESSABLE_ENTITY.value());
        errors.put("error", "Validation Failed");
        errors.put("path", request.getRequestURI());

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fieldError ->
                fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage())
        );
        errors.put("fields", fieldErrors);

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errors);
    }

    // Handles illegal arguments
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request) {

        if ("/api/payments/notify".equals(request.getRequestURI())) {
            String message = ex.getMessage();

            // Only log recognised diagnostic messages, never the payment payload.
            boolean safeMessage = java.util.Set.of(
                    "Invalid payment notification.",
                    "Malformed payment notification.",
                    "Duplicate notification field.",
                    "Invalid payment reference.",
                    "Payment attempt not found.",
                    "Provider transaction reference is required.",
                    "Unsupported payment notification status.",
                    "Invalid notification amount."
            ).contains(message == null ? "" : message);

            log.warn("Payfast ITN rejected: exceptionType={}, reason={}",
                    ex.getClass().getSimpleName(),
                    safeMessage ? message : "Unclassified validation failure");
        }

        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now().toString());
        error.put("status", HttpStatus.BAD_REQUEST.value());
        error.put("error", "Invalid Argument");
        error.put("message", ex.getMessage());
        error.put("path", request.getRequestURI());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Catch-all for anything unexpected
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(
            Exception ex,
            HttpServletRequest request) {

        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now().toString());
        error.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        error.put("error", "Internal Server Error");
        error.put("message", "Something went wrong. Please try again.");
        error.put("path", request.getRequestURI());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}