package pl.bak.home_energy_controller.tuya;

import jakarta.annotation.PostConstruct;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pl.bak.home_energy_controller.db.dao.DeviceRepository;
import pl.bak.home_energy_controller.db.model.DeviceEntity;
import pl.bak.home_energy_controller.db.service.TuyaEnergyService;

import java.util.Map;

@Component
public class TuyaScheduler {

    private final TuyaClient client;
    DeviceRepository deviceRepository;
    TuyaEnergyService tuyaEnergyService;

    public TuyaScheduler(TuyaClient client, DeviceRepository deviceRepository, TuyaEnergyService tuyaEnergyService) {
        this.client = client;
        this.deviceRepository = deviceRepository;
        this.tuyaEnergyService = tuyaEnergyService;
    }

    @PostConstruct
    public void init() {
        try {
            System.out.println("🔄 Inicjalizacja TuyaClient...");
            client.login();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Scheduled(initialDelay = 10000, fixedRate = 60000)
    public void pollDevices() {
        try {
//            var devices = deviceRepository.findAll(); // lub getDevices() z Tuya
//            for (DeviceEntity d : devices) {
                Map<String, Object> statusMap = client.getDeviceStatus("bf8c4e2875cad60e33pqjw");
            System.out.println(statusMap);
            tuyaEnergyService.saveDeviceStatus(
                    "bf8c4e2875cad60e33pqjw",
                    "zasilanie_komputera",
                    "cz",
                    "P021HWA",
                    true,
                    statusMap
            );
//                tuyaEnergyService.processDeviceStatus(
//                        d.getId(),
//                        d.getName(),
//                        d.getCategory(),
//                        d.getModel(),
//                        d.isOnline(),
//                        statusMap
//                );
//            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

