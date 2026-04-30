package com.mambesi.action.security;

import com.mambesi.action.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    //Check if the request has a valid JWT, and if it does, tell Spring who the user is.
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        System.out.println("JWT FILTER HIT");
        String authHeader = request.getHeader("Authorization");
        String token = null;
        String email = null;

        //Authorization: Bearer eyJhbGciOiJIUzI1NiJ9... is sent from frontend.

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);

            //Validate before extracting
            if (jwtService.isTokenValid(token)) {
                email = jwtService.extractEmail(token);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    System.out.println("TOKEN: " + token);
                    System.out.println("EXTRACTED EMAIL: " + jwtService.extractEmail(token));
                    var user = userRepository.findByEmail(email).orElse(null);
                    System.out.println("USER FOUND: " + user);

                    System.out.println("TOKEN VALID: " + jwtService.isTokenValid(token));

                    if (user != null) {
                        System.out.println("DEBUG user: " + user.getEmail() +
                                " role: " + user.getRole() +
                                " authorities: " + user.getAuthorities());

                        var authToken = new UsernamePasswordAuthenticationToken(
                                user, null, user.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        }

        //ALWAYS continue the filter chain
        filterChain.doFilter(request, response);
    }
}