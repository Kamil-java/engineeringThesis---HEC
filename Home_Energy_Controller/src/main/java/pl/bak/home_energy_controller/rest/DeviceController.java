package pl.bak.home_energy_controller.rest;

import org.springframework.web.bind.annotation.*;
import pl.bak.home_energy_controller.db.dao.DeviceRepository;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.mappers.dto.BulbDetailsDto;

import java.util.Optional;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceRepository deviceRepository;

    public DeviceController(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    /**
     * Uzupełnia / aktualizuje dane żarówki dla urządzenia (np. lampki).
     *
     * POST /api/devices/3/bulb
     * {
     *   "bulbDescription": "Philips GU10 5.5W",
     *   "ratedPowerW": 5.5
     * }
     */
    @PostMapping("/{deviceId}/bulb")
    public Device updateBulbDetails(@PathVariable Long deviceId,
                                    @RequestBody BulbDetailsDto dto) {
        Optional<Device> opt = deviceRepository.findById(deviceId);
        if (opt.isEmpty()) {
            throw new IllegalArgumentException("Device not found: " + deviceId);
        }

        Device device = opt.get();

        if (dto.getBulbDescription() != null) {
            device.setBulbDescription(dto.getBulbDescription());
        }
        if (dto.getRatedPowerW() != null) {
            device.setRatedPowerW(dto.getRatedPowerW());
        }

        return deviceRepository.save(device);
    }
}
