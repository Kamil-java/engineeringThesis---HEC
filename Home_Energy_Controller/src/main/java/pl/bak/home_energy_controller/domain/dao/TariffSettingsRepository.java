package pl.bak.home_energy_controller.domain.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.domain.model.TariffSettings;

public interface TariffSettingsRepository extends JpaRepository<TariffSettings, Long> {
}
