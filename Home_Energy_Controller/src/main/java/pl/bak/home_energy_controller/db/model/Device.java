package pl.bak.home_energy_controller.db.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "devices",
        indexes = @Index(name = "idx_devices_tuya_id", columnList = "tuya_id", unique = true))
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tuya_id", nullable = false, unique = true)
    private String tuyaId;          // id z Tuya

    @Column(name = "name")
    private String name;

    @Column(name = "category")
    private String category;        // "cz", "dj", "qt", ...

    @Column(name = "model")
    private String model;

    @Column(name = "ip")
    private String ip;

    @Column(name = "online")
    private Boolean online;

    @Column(name = "last_power_w")
    private Double lastPowerW;

    @Column(name = "last_voltage_v")
    private Double lastVoltageV;

    @Column(name = "last_current_ma")
    private Integer lastCurrentMa;

    @Column(name = "last_energy_kwh")
    private Double lastEnergyKwh;

    @Column(name = "last_update")
    private Instant lastUpdate;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTuyaId() {
        return tuyaId;
    }

    public void setTuyaId(String tuyaId) {
        this.tuyaId = tuyaId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public Boolean getOnline() {
        return online;
    }

    public void setOnline(Boolean online) {
        this.online = online;
    }

    public Double getLastPowerW() {
        return lastPowerW;
    }

    public void setLastPowerW(Double lastPowerW) {
        this.lastPowerW = lastPowerW;
    }

    public Double getLastVoltageV() {
        return lastVoltageV;
    }

    public void setLastVoltageV(Double lastVoltageV) {
        this.lastVoltageV = lastVoltageV;
    }

    public Integer getLastCurrentMa() {
        return lastCurrentMa;
    }

    public void setLastCurrentMa(Integer lastCurrentMa) {
        this.lastCurrentMa = lastCurrentMa;
    }

    public Double getLastEnergyKwh() {
        return lastEnergyKwh;
    }

    public void setLastEnergyKwh(Double lastEnergyKwh) {
        this.lastEnergyKwh = lastEnergyKwh;
    }

    public Instant getLastUpdate() {
        return lastUpdate;
    }

    public void setLastUpdate(Instant lastUpdate) {
        this.lastUpdate = lastUpdate;
    }
}
