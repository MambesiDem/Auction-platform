package com.mambesi.action.config;
import com.mambesi.action.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;
import org.springframework.web.cors.*;
import org.springframework.http.HttpMethod;
import java.util.*;
@Configuration
public class SecurityConfig {
    private final JwtAuthFilter filter;
    @Value("${frontend.url:http://localhost:3000}") private String frontend;
    public SecurityConfig(JwtAuthFilter f){filter=f;}
    @Bean public PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
    @Bean public SecurityFilterChain chain(HttpSecurity http)throws Exception{
        return http.cors(c->c.configurationSource(corsConfigurationSource())).csrf(c->c.disable())
                .sessionManagement(s->s.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
                .exceptionHandling(e->e.authenticationEntryPoint((r,s,x)->s.sendError(401,"Please sign in.")))
                .authorizeHttpRequests(a->a
                        .requestMatchers(HttpMethod.OPTIONS,"/**").permitAll()
                        .requestMatchers(HttpMethod.POST,"/api/users/register","/api/users/login","/api/payments/notify").permitAll()
                        .requestMatchers("/ws-auction/**").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/payments/health","/api/auctions").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/auctions/my-listings").hasAnyAuthority("SELLER","ADMIN")
                        .requestMatchers(HttpMethod.GET,"/api/auctions/my-wins","/api/auctions/my-losses","/api/auctions/my-active-bids","/api/auctions/*/my-bid","/api/auctions/offers").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.PUT,"/api/auctions/offers/*").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET,"/api/auctions/won/**").hasAuthority("ADMIN")
                        .requestMatchers(new RegexRequestMatcher("/api/auctions/[0-9a-fA-F-]{36}","GET")).permitAll()
                        .requestMatchers(HttpMethod.POST,"/api/auctions").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.DELETE,"/api/auctions/*").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.PUT,"/api/auctions/*/close").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,"/api/auctions/*/reopen").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET,"/api/users").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.POST,"/api/users/create-admin").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,"/api/users/*/ban","/api/users/*/unban").hasAuthority("ADMIN")
                        .requestMatchers("/api/users/me").authenticated()
                        .requestMatchers(HttpMethod.POST,"/api/bids/**").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET,"/api/bids/**").authenticated()
                        .requestMatchers(HttpMethod.POST,"/api/deliveries").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET,"/api/deliveries/my-sales").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET,"/api/deliveries/my-purchases").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET,"/api/deliveries/pending","/api/deliveries/my-deliveries").hasAuthority("DRIVER")
                        .requestMatchers(HttpMethod.GET,"/api/deliveries").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,"/api/deliveries/*/reset-code").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,"/api/deliveries/*/accept","/api/deliveries/*/status").hasAuthority("DRIVER")
                        .requestMatchers(HttpMethod.POST,"/api/payments/initiate/*").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET,"/api/payments/my-payments","/api/payments/status/*").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.GET,"/api/payments/my-earnings").hasAuthority("SELLER")
                        .requestMatchers(HttpMethod.GET,"/api/payments").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT,"/api/payments/*/cancel").hasAuthority("BUYER")
                        .requestMatchers(HttpMethod.PUT,"/api/payments/*/confirm-payout","/api/payments/*/confirm-refund","/api/payments/*/reconcile").hasAuthority("ADMIN")
                        .requestMatchers("/api/watchlist/**").hasAuthority("BUYER")
                        .requestMatchers("/api/messages/**","/api/orders/**").authenticated()
                        .requestMatchers("/api/cases/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/cases/**").authenticated()
                        .anyRequest().denyAll())
                .addFilterBefore(filter,UsernamePasswordAuthenticationFilter.class).build();
    }
    @Bean public CorsConfigurationSource corsConfigurationSource(){CorsConfiguration c=new CorsConfiguration();c.setAllowedOrigins(List.of("http://localhost:3000",frontend).stream().distinct().toList());c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Authorization","Content-Type"));c.setAllowCredentials(false);UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;}
    @Bean public AuthenticationManager authenticationManager(AuthenticationConfiguration c)throws Exception{return c.getAuthenticationManager();}
}
