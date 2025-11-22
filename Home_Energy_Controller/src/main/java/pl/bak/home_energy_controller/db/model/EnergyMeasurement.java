package pl.bak.home_energy_controller.db.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "energy_measurements",
        indexes = {
                @Index(name = "idx_energy_device_time", columnList = "device_id, measured_at")
        })
public class EnergyMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "measured_at", nullable = false)
    private Instant measuredAt;

    @Column(name = "energy_kwh")
    private Double energyKwh;      // add_ele (po przeliczeniu)

    @Column(name = "power_w")
    private Double powerW;         // cur_power

    @Column(name = "voltage_v")
    private Double voltageV;       // cur_voltage

    @Column(name = "current_ma")
    private Integer currentMa;     // cur_current

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Device getDevice() {
        return device;
    }

    public void setDevice(Device device) {
        this.device = device;
    }

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public void setMeasuredAt(Instant measuredAt) {
        this.measuredAt = measuredAt;
    }

    public Double getEnergyKwh() {
        return energyKwh;
    }

    public void setEnergyKwh(Double energyKwh) {
        this.energyKwh = energyKwh;
    }

    public Double getPowerW() {
        return powerW;
    }

    public void setPowerW(Double powerW) {
        this.powerW = powerW;
    }

    public Double getVoltageV() {
        return voltageV;
    }

    public void setVoltageV(Double voltageV) {
        this.voltageV = voltageV;
    }

    public Integer getCurrentMa() {
        return currentMa;
    }

    public void setCurrentMa(Integer currentMa) {
        this.currentMa = currentMa;
    }
}

