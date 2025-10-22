package pl.bak.home_energy_controller.db.model;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "energy_daily_summary")
public class EnergyDailySummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String deviceId;
    private LocalDate date;
    private Double totalEnergy; // kWh

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Double getTotalEnergy() {
        return totalEnergy;
    }

    public void setTotalEnergy(Double totalEnergy) {
        this.totalEnergy = totalEnergy;
    }
}
