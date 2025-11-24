package pl.bak.home_energy_controller.rest;

import org.springframework.web.bind.annotation.*;
import pl.bak.home_energy_controller.domain.dao.AdditionalDeviceRepository;
import pl.bak.home_energy_controller.domain.dao.DeviceRepository;
import pl.bak.home_energy_controller.domain.model.AdditionalDevice;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.mappers.dto.BulbDetailsDto;
import pl.bak.home_energy_controller.mappers.dto.DeviceSummaryDto;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceRepository deviceRepository;
    private final AdditionalDeviceRepository additionalDeviceRepository;

    public DeviceController(DeviceRepository deviceRepository,
                            AdditionalDeviceRepository additionalDeviceRepository) {
        this.deviceRepository = deviceRepository;
        this.additionalDeviceRepository = additionalDeviceRepository;
    }

    @GetMapping
    public List<DeviceSummaryDto> getAllDevices() {
        List<DeviceSummaryDto> result = new ArrayList<>();

        for (Device d : deviceRepository.findAll()) {
            DeviceSummaryDto dto = new DeviceSummaryDto();
            dto.setId(d.getId());
            dto.setSource("TUYA");
            dto.setName(d.getName());
            dto.setCategory(d.getCategory());
            dto.setOnline(d.getOnline());
            dto.setRatedPowerW(d.getRatedPowerW());
            dto.setDescription(d.getBulbDescription());
            dto.setModel(d.getModel());
            dto.setIp(d.getIp());
            dto.setLastUpdate(d.getLastUpdate());
            result.add(dto);
        }

        for (AdditionalDevice ad : additionalDeviceRepository.findAll()) {
            DeviceSummaryDto dto = new DeviceSummaryDto();
            dto.setId(ad.getId());
            dto.setSource("ADDITIONAL");
            dto.setName(ad.getName());
            dto.setCategory(ad.getCategory());
            dto.setOnline(null);
            dto.setRatedPowerW(ad.getRatedPowerW());
            dto.setDescription(ad.getDescription());
            dto.setCreatedAt(ad.getCreatedAt());
            dto.setUpdatedAt(ad.getUpdatedAt());
            result.add(dto);
        }

        return result;
    }

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
