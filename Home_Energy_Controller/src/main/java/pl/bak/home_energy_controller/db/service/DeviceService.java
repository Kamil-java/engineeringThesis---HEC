package pl.bak.home_energy_controller.db.service;

import org.springframework.stereotype.Service;
import pl.bak.home_energy_controller.db.dao.DeviceRepository;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.mappers.TuyaStatusParser;

import java.time.Instant;
import java.util.Map;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final TuyaStatusParser statusParser;

    public DeviceService(DeviceRepository deviceRepository, TuyaStatusParser statusParser) {
        this.deviceRepository = deviceRepository;
        this.statusParser = statusParser;
    }

    public Device upsertDeviceFromMap(Map<String, Object> src) {
        String tuyaId = (String) src.get("id");
        Device device = deviceRepository.findByTuyaId(tuyaId)
                .orElseGet(() -> {
                    Device d = new Device();
                    d.setTuyaId(tuyaId);
                    return d;
                });

        device.setName((String) src.get("name"));
        device.setCategory((String) src.get("category"));
        device.setModel((String) src.get("model"));
        device.setIp((String) src.get("ip"));
        device.setOnline((Boolean) src.get("online"));
        device.setLastUpdate(Instant.now());

        TuyaStatusParser.ParsedValues pv = statusParser.parse(src);
        if (pv.powerW != null) device.setLastPowerW(pv.powerW);
        if (pv.voltageV != null) device.setLastVoltageV(pv.voltageV);
        if (pv.currentMa != null) device.setLastCurrentMa(pv.currentMa);
        if (pv.energyKwh != null) device.setLastEnergyKwh(pv.energyKwh);

        return deviceRepository.save(device); // UPDATE albo INSERT
    }
}

