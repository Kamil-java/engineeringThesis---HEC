package pl.bak.home_energy_controller.db.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.db.model.DeviceEntity;

import java.util.Optional;
import java.util.UUID;

public interface DeviceRepository extends JpaRepository<DeviceEntity, String> {
}