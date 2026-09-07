package com.mambesi.action.config;

import com.mambesi.action.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/users/register", "/api/users/login").permitAll()
                        .requestMatchers("/ws-auction/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auctions", "/api/auctions/{id}").permitAll()

                        // User endpoints
                        .requestMatchers(HttpMethod.GET, "/api/users/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/users/create-admin").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/ban").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/unban").hasAuthority("ADMIN")

                        // Auction endpoints - public GETs first
                        .requestMatchers(HttpMethod.GET, "/api/auctions").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auctions/my-wins").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/auctions/won/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/auctions/{id}").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auctions").hasAnyAuthority("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/auctions/**").hasAnyAuthority("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/auctions/*/close").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/auctions/*/reopen").hasAuthority("SELLER")

                        // Bid endpoints
                        .requestMatchers(HttpMethod.POST, "/api/bids/**").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET, "/api/bids/**").authenticated()

                        // Delivery endpoints
                        .requestMatchers(HttpMethod.POST, "/api/deliveries").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET, "/api/deliveries/my-sales").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET, "/api/deliveries/my-purchases").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET, "/api/deliveries/my-deliveries").hasAuthority("DRIVER")
                        .requestMatchers(HttpMethod.GET, "/api/deliveries/pending").hasAuthority("DRIVER")
                        .requestMatchers(HttpMethod.PUT, "/api/deliveries/**").hasAuthority("DRIVER")

                        // Payment endpoints
                        .requestMatchers(HttpMethod.POST, "/api/payments/notify").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/payments/initiate/**").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET, "/api/payments/my-payments").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET, "/api/payments/my-earnings").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET, "/api/payments").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/payments/*/release").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/payments/*/refund").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/payments/*/cancel").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET, "/api/payments/status/**").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET, "/api/payments/health").permitAll()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                frontendUrl
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}