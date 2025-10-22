package pl.bak.home_energy_controller.db.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.db.model.EnergyDailySummary;

import java.util.Optional;

public interface EnergyDailySummaryRepository extends JpaRepository<EnergyDailySummary, Long> {
    Optional<EnergyDailySummary> findByDeviceIdAndDate(String deviceId, java.time.LocalDate date);
}
