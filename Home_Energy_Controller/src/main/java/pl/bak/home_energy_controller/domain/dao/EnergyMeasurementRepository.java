package pl.bak.home_energy_controller.domain.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.domain.model.EnergyMeasurement;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EnergyMeasurementRepository extends JpaRepository<EnergyMeasurement, Long> {

    List<EnergyMeasurement> findByDeviceAndMeasuredAtBetweenOrderByMeasuredAt(
            Device device,
            Instant from,
            Instant to
    );

    Optional<EnergyMeasurement> findTopByDeviceOrderByMeasuredAtDesc(Device device);
}

