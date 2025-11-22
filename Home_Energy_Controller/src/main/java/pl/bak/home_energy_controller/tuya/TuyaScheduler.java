package pl.bak.home_energy_controller.tuya;

import jakarta.annotation.PostConstruct;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pl.bak.home_energy_controller.db.dao.DeviceRepository;
import pl.bak.home_energy_controller.db.model.DeviceEntity;
import pl.bak.home_energy_controller.db.service.TuyaEnergyService;

import java.time.LocalDateTime;
import java.util.List;
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
            client.login();
            List<Map<String, Object>> devices = client.getAllDevices();

            if (devices == null || devices.isEmpty()) {
                System.err.println("⚠️ No devices fetched from Tuya.");
                return;
            }

            System.out.println("📡 Found " + devices.size() + " devices");

            for (Map<String, Object> deviceData : devices) {
                String category = (String) deviceData.get("category");

                saveDeviceToDb(deviceData);
            }

            System.out.println("✅ Devices saved to database");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void saveDeviceToDb(Map<String, Object> data) {
        data.forEach((s, o) -> System.out.println(s + ": " + o));
        String id = (String) data.get("id");
        String name = (String) data.get("name");
        String category = (String) data.get("category");
        String model = (String) data.get("model");
        boolean online = (Boolean) data.get("online");

        DeviceEntity device = deviceRepository.findById(id).orElse(new DeviceEntity());
        device.setId(id);
        device.setName(name);
        device.setCategory(category);
        device.setModel(model);
        device.setOnline(online);
        device.setLastUpdated(LocalDateTime.now());

        deviceRepository.save(device);
        System.out.println("💾 Saved device: " + name + " (" + id + ")");
    }
}

