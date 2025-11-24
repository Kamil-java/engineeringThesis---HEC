package pl.bak.home_energy_controller.domain.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("select avg(em.powerW) from EnergyMeasurement em " +
            "where em.device.id = :deviceId and em.measuredAt >= :since")
    Double findAveragePowerWForDeviceSince(
            @Param("deviceId") Long deviceId,
            @Param("since") Instant since
    );
}

