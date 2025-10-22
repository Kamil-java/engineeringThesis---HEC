package pl.bak.home_energy_controller.db.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.bak.home_energy_controller.db.model.Device;
import pl.bak.home_energy_controller.db.model.EnergyPeriodType;
import pl.bak.home_energy_controller.db.model.EnergyStat;

import java.util.List;

public interface EnergyStatRepository extends JpaRepository<EnergyStat, Long> {
    List<EnergyStat> findByDeviceAndType(Device device, EnergyPeriodType type);
}
