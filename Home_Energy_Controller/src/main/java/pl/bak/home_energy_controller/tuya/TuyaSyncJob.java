package pl.bak.home_energy_controller.tuya;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.bak.home_energy_controller.db.dao.DeviceRepository;
import pl.bak.home_energy_controller.db.dao.EnergyMeasurementRepository;
import pl.bak.home_energy_controller.db.dao.LightingUsageRepository;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.db.model.EnergyMeasurement;
import pl.bak.home_energy_controller.db.model.LightingUsage;
import pl.bak.home_energy_controller.db.service.DeviceService;
import pl.bak.home_energy_controller.db.service.EnergyMeasurementService;
import pl.bak.home_energy_controller.mappers.TuyaStatusParser;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class TuyaSyncJob {

    // do debugowania konkretnej lampki – możesz zmienić lub wyłączyć
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

    /**
     * Co 60 sekund:
     *  - pobiera urządzenia z Tuya,
     *  - aktualizuje tabelę devices (snapshot),
     *  - dla "cz" zapisuje historię energii,
     *  - dla urządzeń z DP switchOn (poza "cz") zapisuje okresy świecenia.
     */
    @Scheduled(fixedRate = 60_000L, initialDelay = 10_000L)
    @Transactional
    public void syncDevices() {
        Instant now = Instant.now();

        try {
            List<Map<String, Object>> devicesFromTuya = tuyaClient.getAllDevices();
            System.out.println("[📡] Devices fetched: " + devicesFromTuya.size());

            for (Map<String, Object> devMap : devicesFromTuya) {
                String tuyaId = (String) devMap.get("id");

                // DEBUG – pokaż cały status dla lampki, na której pracujesz
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

        // stan sprzed aktualizacji
        boolean previousOn    = Boolean.TRUE.equals(device.getLastSwitchOn());
        Instant previousSince = device.getLastSwitchOnSince();

        // aktualizacja podstawowych pól
        device.setName((String) devMap.get("name"));
        device.setCategory(category);
        device.setModel((String) devMap.get("model"));
        device.setIp((String) devMap.get("ip"));
        device.setOnline((Boolean) devMap.get("online"));
        device.setLastUpdate(now);

        // zapisujemy device (musi mieć ID dla FK)
        device = deviceRepository.save(device);

        // parsujemy statusy
        TuyaStatusParser.ParsedValues pv = statusParser.parse(devMap);

        // LOG diagnostyczny – rawSwitchOn (to co przyszło z Tuya)
        System.out.printf(
                "[SYNC] dev=%s cat=%s online=%s prevOn=%s rawSwitchOn=%s prevSince=%s%n",
                tuyaId,
                category,
                device.getOnline(),
                previousOn,
                pv.switchOn,
                previousSince
        );

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

        // czy mamy DP przełącznika
        boolean hasSwitch = pv.switchOn != null;

        // na start: każde urządzenie z DP switchOn, które NIE jest "cz", traktujemy jako światło
        boolean isLighting = hasSwitch && !"cz".equals(category);
        if (!isLighting) {
            return;
        }

        boolean rawSwitchOn = Boolean.TRUE.equals(pv.switchOn);     // DP z Tuya
        boolean online      = Boolean.TRUE.equals(device.getOnline());

        // efektywny stan "świeci": przełącznik ON i urządzenie online
        boolean currentOn   = rawSwitchOn && online;

        System.out.printf(
                "[LIGHT] dev=%s cat=%s online=%s rawSwitchOn=%s prevOn=%s currOn=%s prevSince=%s%n",
                device.getTuyaId(),
                category,
                online,
                rawSwitchOn,
                previousOn,
                currentOn,
                previousSince
        );

        // OFF -> ON
        if (!previousOn && currentOn) {
            System.out.printf("[LIGHT] %s: OFF -> ON (start=%s)%n", device.getTuyaId(), now);
            device.setLastSwitchOn(true);
            device.setLastSwitchOnSince(now);
        }

        // ON -> OFF
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

                System.out.printf(
                        "[LIGHT] zapisano lighting_usage: dev=%s start=%s end=%s dur=%ds%n",
                        device.getTuyaId(), previousSince, now, duration
                );
            }

            device.setLastSwitchOnSince(null);
        }

        // ON -> ON / OFF -> OFF – nie ruszamy since
        device.setLastSwitchOn(currentOn);
        // device jest już managed, nie trzeba tu kolejnego save()
    }
}





