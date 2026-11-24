package com.mambesi.action.location;

import com.mambesi.action.user.User;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/addresses")
public class UserAddressController {

    private final UserAddressService service;

    public UserAddressController(UserAddressService service) {
        this.service = service;
    }

    @GetMapping
    public List<UserAddressService.Item> list(Authentication authentication) {
        return service.list(user(authentication));
    }

    @PostMapping
    public UserAddressService.Item create(@Valid @RequestBody UserAddressService.Input input,
                                          Authentication authentication) {
        return service.create(user(authentication), input);
    }

    @PutMapping("/{id}")
    public UserAddressService.Item update(@PathVariable UUID id,
                                          @Valid @RequestBody UserAddressService.Input input,
                                          Authentication authentication) {
        return service.update(user(authentication), id, input);
    }

    @PutMapping("/{id}/default")
    public UserAddressService.Item makeDefault(@PathVariable UUID id,
                                               Authentication authentication) {
        return service.makeDefault(user(authentication), id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id, Authentication authentication) {
        service.delete(user(authentication), id);
    }

    private User user(Authentication authentication) {
        return (User) authentication.getPrincipal();
    }
}