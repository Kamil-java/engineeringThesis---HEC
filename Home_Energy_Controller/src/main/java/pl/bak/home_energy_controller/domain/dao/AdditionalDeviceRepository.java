package pl.bak.home_energy_controller.domain.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.bak.home_energy_controller.domain.model.AdditionalDevice;

@Repository
public interface AdditionalDeviceRepository extends JpaRepository<AdditionalDevice, Long> {
}