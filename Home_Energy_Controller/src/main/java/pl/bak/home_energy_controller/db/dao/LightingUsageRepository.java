package pl.bak.home_energy_controller.db.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.db.model.LightingUsage;

public interface LightingUsageRepository extends JpaRepository<LightingUsage, Long> {
}

