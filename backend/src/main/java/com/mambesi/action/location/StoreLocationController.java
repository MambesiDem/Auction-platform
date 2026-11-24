package com.mambesi.action.location;

import com.mambesi.action.user.User;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/seller-profiles/{profileId}/locations")
public class StoreLocationController {

    private final StoreLocationService service;

    public StoreLocationController(StoreLocationService service) {
        this.service = service;
    }

    @GetMapping
    public List<StoreLocationService.LocationView> list(@PathVariable UUID profileId,
                                                        Authentication authentication) {
        return service.list(user(authentication), profileId);
    }

    @PostMapping
    public StoreLocationService.LocationView create(
            @PathVariable UUID profileId,
            @Valid @RequestBody StoreLocationService.LocationInput input,
            Authentication authentication) {
        return service.create(user(authentication), profileId, input);
    }

    @PutMapping("/{id}")
    public StoreLocationService.LocationView update(
            @PathVariable UUID profileId,
            @PathVariable UUID id,
            @Valid @RequestBody StoreLocationService.LocationInput input,
            Authentication authentication) {
        return service.update(user(authentication), profileId, id, input);
    }

    @PutMapping("/{id}/default")
    public StoreLocationService.LocationView makeDefault(@PathVariable UUID profileId,
                                                         @PathVariable UUID id,
                                                         Authentication authentication) {
        return service.makeDefault(user(authentication), profileId, id);
    }

    @DeleteMapping("/{id}")
    public void archive(@PathVariable UUID profileId,
                        @PathVariable UUID id,
                        Authentication authentication) {
        service.archive(user(authentication), profileId, id);
    }

    private User user(Authentication authentication) {
        return (User) authentication.getPrincipal();
    }
}