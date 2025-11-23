package pl.bak.home_energy_controller.domain.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.domain.model.Device;
import pl.bak.home_energy_controller.domain.model.LightingUsage;

import java.time.Instant;
import java.util.List;

public interface LightingUsageRepository extends JpaRepository<LightingUsage, Long> {

    List<LightingUsage> findByDeviceAndStartTimeBetween(
            Device device,
            Instant from,
            Instant to
    );
}

