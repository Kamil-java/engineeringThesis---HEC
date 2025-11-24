// src/api/deviceApi.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080', // ew. zmień jeśli backend ma inny adres
});

// ------ URZĄDZENIA (lista – Tuya + Additional jako summary DTO) ------

export async function fetchAllDevices() {
  const res = await api.get('/api/devices');

  return res.data.map((d) => ({
    id: d.id,
    source: d.source, // "TUYA" albo "ADDITIONAL"
    name: d.name,
    category: d.category,
    online: d.online ?? null,

    ratedPowerW: d.ratedPowerW ?? null,
    description: d.description ?? null,

    model: d.model ?? null,
    ip: d.ip ?? null,
    lastUpdate: d.lastUpdate ?? null,

    // 🔴 KLUCZOWE: NIE UTRAC DANYCH O DATAH
    createdAt: d.createdAt ?? d.created_at ?? null,
    updatedAt: d.updatedAt ?? d.updated_at ?? null,
  }));
}

// 🔄 TUYA: update bulb details (bulbDescription, ratedPowerW)
export async function updateBulbDetails(deviceId, payload) {
  // payload: { bulbDescription?: string, ratedPowerW?: number }
  const response = await api.post(`/api/devices/${deviceId}/bulb`, payload);
  return response.data;
}

// ------ URZĄDZENIA DODATKOWE (CRUD) ------

export async function fetchAdditionalDevices() {
  const res = await api.get('/api/additional-devices');

  return res.data.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    ratedPowerW: d.ratedPowerW ?? null,
    description: d.description ?? null,
    createdAt: d.createdAt ?? d.created_at ?? null,
    updatedAt: d.updatedAt ?? d.updated_at ?? null,
  }));
}

export async function fetchAdditionalDevice(id) {
  const response = await api.get(`/api/additional-devices/${id}`);
  return response.data;
}

export async function createAdditionalDevice(payload) {
  const response = await api.post('/api/additional-devices', payload);
  return response.data;
}

export async function updateAdditionalDevice(id, payload) {
  const response = await api.put(`/api/additional-devices/${id}`, payload);
  return response.data;
}

export async function deleteAdditionalDevice(id) {
  await api.delete(`/api/additional-devices/${id}`);
}

// ------ KOSZTY / POMIARY TUYA ------

export async function fetchDeviceCurrentMonthCost(deviceId) {
  const response = await api.get(
    `/api/cost/device/${deviceId}/current-month`
  );
  return response.data;
}

export async function fetchDeviceTodayCost(deviceId) {
  const response = await api.get(`/api/cost/device/${deviceId}/today`);
  return response.data;
}

export async function fetchDeviceLastHourCost(deviceId) {
  const response = await api.get(`/api/cost/device/${deviceId}/last-hour`);
  return response.data;
}

export async function estimateDeviceCost(deviceId, hours) {
  const response = await api.get(
    `/api/cost/device/${deviceId}/estimate`,
    {
      params: { hours },
    }
  );
  return response.data;
}

// ------ ESTYMACJA KOSZTU URZĄDZEŃ DODATKOWYCH ------

export async function estimateAdditionalDeviceCost(deviceId, params) {
  const response = await api.get(
    `/api/cost/additional-device/${deviceId}/estimate`,
    { params }
  );
  return response.data;
}

// ------ PODSUMOWANIE MIESIĘCZNE ------

export async function fetchCurrentMonthSummary() {
  const response = await api.get('/api/cost/current-month/summary');
  return response.data;
}

export async function fetchLightingCurrentMonth(deviceId) {
  const response = await api.get(
    `/api/cost/lighting/device/${deviceId}/current-month`
  );
  return response.data;
}

// ------ TARYFA PRĄDU ------

export async function fetchTariffSettings() {
  const res = await api.get('/api/tariff/settings');
  return res.data;
}

export async function updateTariffSettings(dto) {
  const res = await api.put('/api/tariff/settings', dto);
  return res.data;
}

