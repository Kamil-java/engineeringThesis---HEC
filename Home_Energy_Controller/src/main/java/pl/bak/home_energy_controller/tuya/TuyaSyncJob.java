package pl.bak.home_energy_controller.tuya;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.bak.home_energy_controller.domain.dao.DeviceRepository;
import pl.bak.home_energy_controller.domain.dao.EnergyMeasurementRepository;
import pl.bak.home_energy_controller.domain.dao.LightingUsageRepository;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.domain.model.EnergyMeasurement;
import pl.bak.home_energy_controller.domain.model.LightingUsage;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class TuyaSyncJob {

    private static final String DEBUG_LAMP_ID = "bf707d569064d228b9u8i2";

    private final TuyaClient tuyaClient;
    private final DeviceRepository deviceRepository;
    private final EnergyMeasurementRepository energyMeasurementRepository;
    private final LightingUsageRepository lightingUsageRepository;
    private final TuyaStatusParser statusParser;

    public TuyaSyncJob(TuyaClient tuyaClient,
                       DeviceRepository deviceRepository,
                       EnergyMeasurementRepository energyMeasurementRepository,
                       LightingUsageRepository lightingUsageRepository,
                       TuyaStatusParser statusParser) {
        this.tuyaClient = tuyaClient;
        this.deviceRepository = deviceRepository;
        this.energyMeasurementRepository = energyMeasurementRepository;
        this.lightingUsageRepository = lightingUsageRepository;
        this.statusParser = statusParser;
    }

    @Scheduled(fixedRate = 60_000L, initialDelay = 10_000L)
    @Transactional
    public void syncDevices() {
        Instant now = Instant.now();

        try {
            List<Map<String, Object>> devicesFromTuya = tuyaClient.getAllDevices();
            System.out.println("[📡] Devices fetched: " + devicesFromTuya.size());

            for (Map<String, Object> devMap : devicesFromTuya) {
                String tuyaId = (String) devMap.get("id");

                if (DEBUG_LAMP_ID.equals(tuyaId)) {
                    System.out.println("=== DEBUG STATUS for " + DEBUG_LAMP_ID + " ===");
                    System.out.println(devMap);
                }

                processSingleDevice(devMap, now);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void processSingleDevice(Map<String, Object> devMap, Instant now) {
        String tuyaId   = (String) devMap.get("id");
        String category = (String) devMap.get("category");

        if (tuyaId == null) {
            return;
        }

        Device device = deviceRepository.findByTuyaId(tuyaId)
                .orElseGet(() -> {
                    Device d = new Device();
                    d.setTuyaId(tuyaId);
                    return d;
                });

        boolean previousOn    = Boolean.TRUE.equals(device.getLastSwitchOn());
        Instant previousSince = device.getLastSwitchOnSince();

        device.setName((String) devMap.get("name"));
        device.setCategory(category);
        device.setModel((String) devMap.get("model"));
        device.setIp((String) devMap.get("ip"));
        device.setOnline((Boolean) devMap.get("online"));
        device.setLastUpdate(now);

        device = deviceRepository.save(device);

        TuyaStatusParser.ParsedValues pv = statusParser.parse(devMap);

        handleEnergyHistory(device, pv, now);
        handleLightingHistory(device, pv, category, now, previousOn, previousSince);
    }

    private void handleEnergyHistory(Device device,
                                     TuyaStatusParser.ParsedValues pv,
                                     Instant now) {
        if (!"cz".equals(device.getCategory())) {
            return;
        }

        if (pv.energyKwh == null && pv.powerW == null && pv.voltageV == null && pv.currentMa == null) {
            return;
        }

        EnergyMeasurement em = new EnergyMeasurement();
        em.setDevice(device);
        em.setMeasuredAt(now);
        em.setEnergyKwh(pv.energyKwh);
        em.setPowerW(pv.powerW);
        em.setVoltageV(pv.voltageV);
        em.setCurrentMa(pv.currentMa);

        energyMeasurementRepository.save(em);
    }

    private void handleLightingHistory(Device device,
                                       TuyaStatusParser.ParsedValues pv,
                                       String category,
                                       Instant now,
                                       boolean previousOn,
                                       Instant previousSince) {

        boolean hasSwitch = pv.switchOn != null;

        boolean isLighting = hasSwitch && !"cz".equals(category);
        if (!isLighting) {
            return;
        }

        boolean rawSwitchOn = Boolean.TRUE.equals(pv.switchOn);
        boolean online      = Boolean.TRUE.equals(device.getOnline());

        boolean currentOn   = rawSwitchOn && online;

        if (!previousOn && currentOn) {
            System.out.printf("[LIGHT] %s: OFF -> ON (start=%s)%n", device.getTuyaId(), now);
            device.setLastSwitchOn(true);
            device.setLastSwitchOnSince(now);
        }

        else if (previousOn && !currentOn) {
            System.out.printf("[LIGHT] %s: ON -> OFF%n", device.getTuyaId());
            device.setLastSwitchOn(false);

            if (previousSince != null) {
                LightingUsage usage = new LightingUsage();
                usage.setDevice(device);
                usage.setStartTime(previousSince);
                usage.setEndTime(now);
                long duration = Duration.between(previousSince, now).getSeconds();
                usage.setDurationSeconds(duration);

                lightingUsageRepository.save(usage);
            }

            device.setLastSwitchOnSince(null);
        }

        device.setLastSwitchOn(currentOn);
    }
}





