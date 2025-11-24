package pl.bak.home_energy_controller.rest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import pl.bak.home_energy_controller.domain.service.TariffSettingsService;
import pl.bak.home_energy_controller.mappers.dto.TariffSettingsDto;

@RestController
@RequestMapping("/api/tariff")
public class TariffSettingsController {

    private final TariffSettingsService service;

    public TariffSettingsController(TariffSettingsService service) {
        this.service = service;
    }

    @GetMapping("/settings")
    public TariffSettingsDto getSettings() {
        return service.getCurrentSettings();
    }

    @PutMapping("/settings")
    public TariffSettingsDto updateSettings(@RequestBody TariffSettingsDto dto) {
        return service.updateSettings(dto);
    }
}
