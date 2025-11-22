package pl.bak.home_energy_controller.db.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.db.model.Device;

import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByTuyaId(String tuyaId);
}
