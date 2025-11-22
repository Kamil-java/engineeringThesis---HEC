package pl.bak.home_energy_controller.db.service;

import org.springframework.stereotype.Service;
import pl.bak.home_energy_controller.db.dao.EnergyMeasurementRepository;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.db.model.EnergyMeasurement;
import pl.bak.home_energy_controller.mappers.TuyaStatusParser;

import java.time.Instant;
import java.util.Map;

@Service
public class EnergyMeasurementService {

    private final EnergyMeasurementRepository energyRepo;
    private final TuyaStatusParser statusParser;

    public EnergyMeasurementService(EnergyMeasurementRepository energyRepo, TuyaStatusParser statusParser) {
        this.energyRepo = energyRepo;
        this.statusParser = statusParser;
    }

    public void createMeasurementIfCz(Device device, Map<String, Object> src) {
        if (!"cz".equals(device.getCategory())) {
            return;
        }

        TuyaStatusParser.ParsedValues pv = statusParser.parse(src);

        EnergyMeasurement m = new EnergyMeasurement();
        m.setDevice(device);
        m.setMeasuredAt(Instant.now());
        m.setEnergyKwh(pv.energyKwh);
        m.setPowerW(pv.powerW);
        m.setVoltageV(pv.voltageV);
        m.setCurrentMa(pv.currentMa);

        energyRepo.save(m);
    }
}
