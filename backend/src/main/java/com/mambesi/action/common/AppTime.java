package com.mambesi.action.common;

import java.time.LocalDateTime;
import java.time.ZoneId;

public final class AppTime {
    private AppTime() {}
    public static LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Africa/Johannesburg")); }
}
