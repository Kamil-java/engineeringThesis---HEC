// frontend/src/api/deviceApi.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080', // popraw, jeśli backend gdzie indziej
});

// ------ URZĄDZENIA (lista) ------

export async function fetchAllDevices() {
  const response = await api.get('/api/devices');
  return response.data;
}

// ------ URZĄDZENIA DODATKOWE (CRUD) ------

export async function fetchAdditionalDevices() {
  const response = await api.get('/api/additional-devices');
  return response.data;
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

/**
 * Koszt bieżącego miesiąca dla urządzenia (na podstawie pomiarów).
 * Backend:
 *   GET /api/cost/device/{deviceId}/current-month
 */
export async function fetchDeviceCurrentMonthCost(deviceId) {
  const response = await api.get(
    `/api/costs/device/${deviceId}/current-month`
  );
  return response.data;
}

/**
 * Estymacja kosztu dla urządzenia (Tuya) dla zadanej liczby godzin.
 *
 * Backend:
 *   GET /api/cost/device/{deviceId}/estimate?hours=...
 */
export async function estimateDeviceCost(deviceId, hours) {
  const response = await api.get(
    `/api/costs/device/${deviceId}/estimate`,
    {
      params: { hours },
    }
  );
  return response.data;
}

// ------ ESTYMACJA KOSZTU URZĄDZEŃ DODATKOWYCH ------

/**
 * Estymacja kosztu dla urządzenia dodatkowego.
 *
 * Backend:
 *  GET /api/cost/additional-device/{deviceId}/estimate
 *    ?hours=...
 *    lub
 *    ?days=...&avgHoursPerDay=...
 */
export async function estimateAdditionalDeviceCost(deviceId, params) {
  const response = await api.get(
    `/api/costs/additional-device/${deviceId}/estimate`,
    { params }
  );
  return response.data;
}
