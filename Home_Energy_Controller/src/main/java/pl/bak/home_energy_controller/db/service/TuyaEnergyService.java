package pl.bak.home_energy_controller.db.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.bak.home_energy_controller.db.dao.DeviceRepository;
import pl.bak.home_energy_controller.db.dao.EnergyDailySummaryRepository;
import pl.bak.home_energy_controller.db.model.DeviceEntity;
import pl.bak.home_energy_controller.db.model.EnergyDailySummary;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class TuyaEnergyService {

    private final DeviceRepository deviceRepository;
    private final EnergyDailySummaryRepository summaryRepository;

    public TuyaEnergyService(DeviceRepository deviceRepository, EnergyDailySummaryRepository summaryRepository) {
        this.deviceRepository = deviceRepository;
        this.summaryRepository = summaryRepository;
    }

    @Transactional
    public void processDeviceStatus(String deviceId,
                                    String name,
                                    String category,
                                    String model,
                                    boolean online,
                                    Map<String, Object> statusMap) {

        double curPower = ((Number) statusMap.getOrDefault("cur_power", 0)).doubleValue() / 1000.0; // mW -> W
        double curCurrent = ((Number) statusMap.getOrDefault("cur_current", 0)).doubleValue() / 1000.0; // mA -> A
        double curVoltage = ((Number) statusMap.getOrDefault("cur_voltage", 0)).doubleValue() / 10.0; // dzielone przez 10
        double addEle = ((Number) statusMap.getOrDefault("add_ele", 0)).doubleValue() / 1000.0; // Wh -> kWh

        // ✅ Zapis lub aktualizacja urządzenia
        DeviceEntity device = deviceRepository.findById(deviceId).orElse(new DeviceEntity());
        device.setId(deviceId);
        device.setName(name);
        device.setCategory(category);
        device.setModel(model);
        device.setOnline(online);
        device.setCurrentPower(curPower);
        device.setCurrentCurrent(curCurrent);
        device.setCurrentVoltage(curVoltage);
        device.setTotalEnergy(addEle);
        device.setLastUpdated(LocalDateTime.now());
        deviceRepository.save(device);

        // 🧮 Dzienna agregacja
        var today = LocalDate.now();
        var summary = summaryRepository.findByDeviceIdAndDate(deviceId, today)
                .orElseGet(() -> {
                    EnergyDailySummary s = new EnergyDailySummary();
                    s.setDeviceId(deviceId);
                    s.setDate(today);
                    s.setTotalEnergy(0.0);
                    return s;
                });

        // sumujemy przyrost energii (symulacja)
        summary.setTotalEnergy(summary.getTotalEnergy() + curPower / 1000.0);
        summaryRepository.save(summary);
    }

    public void saveDeviceStatus(String deviceId, String name, String category, String model, boolean online, Map<String, Object> statusMap) {

        // 1️⃣ Wyciągamy wartości energetyczne
        double curPower = ((Number) statusMap.getOrDefault("cur_power", 0)).doubleValue() / 1000.0; // mW -> W
        double curCurrent = ((Number) statusMap.getOrDefault("cur_current", 0)).doubleValue() / 1000.0; // mA -> A
        double curVoltage = ((Number) statusMap.getOrDefault("cur_voltage", 0)).doubleValue() / 10.0; // dzielone przez 10
        double addEle = ((Number) statusMap.getOrDefault("add_ele", 0)).doubleValue() / 1000.0; // Wh -> kWh

        // 2️⃣ Zapis lub aktualizacja urządzenia
        DeviceEntity device = deviceRepository.findById(deviceId).orElse(new DeviceEntity());
        device.setId(deviceId);
        device.setName(name);
        device.setCategory(category);
        device.setModel(model);
        device.setOnline(online);
        device.setCurrentPower(curPower);
        device.setCurrentCurrent(curCurrent);
        device.setCurrentVoltage(curVoltage);
        device.setTotalEnergy(addEle);
        device.setLastUpdated(LocalDateTime.now());
        deviceRepository.save(device);

        // 3️⃣ Dzienna agregacja
        LocalDate today = LocalDate.now();
        EnergyDailySummary dailySummary = summaryRepository.findByDeviceIdAndDate(deviceId, today)
                .orElseGet(() -> {
                    EnergyDailySummary s = new EnergyDailySummary();
                    s.setDeviceId(deviceId);
                    s.setDate(today);
                    s.setTotalEnergy(0.0);
                    return s;
                });

        // sumujemy przyrost energii (można tu dopracować logikę np. delta od ostatniego pomiaru)
        dailySummary.setTotalEnergy(dailySummary.getTotalEnergy() + addEle);
        summaryRepository.save(dailySummary);

        System.out.println("✅ Device " + name + " saved. Power: " + curPower + " W, TotalEnergy: " + addEle + " kWh");
    }


}
