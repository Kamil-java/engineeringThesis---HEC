package pl.bak.home_energy_controller.tuya;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.db.service.DeviceService;
import pl.bak.home_energy_controller.db.service.EnergyMeasurementService;

import java.util.List;
import java.util.Map;

@Service
public class TuyaSyncJob {

    private final TuyaClient tuyaApiService;
    private final DeviceService deviceService;
    private final EnergyMeasurementService energyMeasurementService;

    public TuyaSyncJob(TuyaClient tuyaApiService, DeviceService deviceService, EnergyMeasurementService energyMeasurementService) {
        this.tuyaApiService = tuyaApiService;
        this.deviceService = deviceService;
        this.energyMeasurementService = energyMeasurementService;
    }

    @Scheduled(fixedRate = 60_000L, initialDelay = 10_000L)
    public void syncDevices() {
        try {
            List<Map<String, Object>> devices = tuyaApiService.getAllDevices();

            for (Map<String, Object> devMap : devices) {
                Device device = deviceService.upsertDeviceFromMap(devMap);

                energyMeasurementService.createMeasurementIfCz(device, devMap);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}


