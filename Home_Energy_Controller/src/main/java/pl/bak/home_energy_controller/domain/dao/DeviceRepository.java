package pl.bak.home_energy_controller.domain.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.domain.model.Device;

import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByTuyaId(String tuyaId);
}
