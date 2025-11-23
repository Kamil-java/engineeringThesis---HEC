// frontend/src/components/CostCalculator.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchAllDevices,
  fetchDeviceCurrentMonthCost,
  estimateDeviceCost,
  estimateAdditionalDeviceCost,
} from '../api/deviceApi';

function CostCalculator() {
  const [tuyaDevices, setTuyaDevices] = useState([]);
  const [additionalDevices, setAdditionalDevices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- TUYA: koszty miesięczne ----
  const [selectedTuyaIds, setSelectedTuyaIds] = useState(new Set());
  const [calculatingTuyaIds, setCalculatingTuyaIds] = useState(new Set());
  const [tuyaBulkLoading, setTuyaBulkLoading] = useState(false);
  const [tuyaResults, setTuyaResults] = useState([]); // { deviceId, name, ratedPowerW, cost, energyKwh, month, year }

  // ---- TUYA: estymacja na X godzin ----
  const [tuyaEstimateHours, setTuyaEstimateHours] = useState('5');
  const [tuyaEstimatingIds, setTuyaEstimatingIds] = useState(new Set());
  const [tuyaEstimateBulkLoading, setTuyaEstimateBulkLoading] = useState(false);
  const [tuyaEstimateResults, setTuyaEstimateResults] = useState([]); // { deviceId, name, ratedPowerW, cost, energyKwh, hours }

  // ---- ADDITIONAL ----
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState(
    new Set()
  );
  const [calculatingAdditionalIds, setCalculatingAdditionalIds] = useState(
    new Set()
  );
  const [additionalBulkLoading, setAdditionalBulkLoading] = useState(false);
  const [additionalResults, setAdditionalResults] = useState([]);

  // Formularz estymacji (dla additional)
  const [estimateForm, setEstimateForm] = useState({
    mode: 'DAYS_AVG_PER_DAY', // 'HOURS_TOTAL' | 'DAYS_AVG_PER_DAY'
    totalHours: '',
    days: '',
    avgHoursPerDay: '',
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const all = await fetchAllDevices();
        const tuya = all.filter((d) => d.source === 'TUYA');
        const additional = all.filter((d) => d.source === 'ADDITIONAL');
        setTuyaDevices(tuya);
        setAdditionalDevices(additional);
      } catch (e) {
        console.error(e);
        setError('Nie udało się pobrać listy urządzeń.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ---- TUYA: helpery (miesięczne koszty) ----

  const toggleTuyaSelected = (id) => {
    setSelectedTuyaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const upsertTuyaResult = (entry) => {
    setTuyaResults((prev) => {
      const idx = prev.findIndex((r) => r.deviceId === entry.deviceId);
      if (idx === -1) return [...prev, entry];
      const copy = [...prev];
      copy[idx] = entry;
      return copy;
    });
  };

  const handleTuyaCalculateOne = async (device) => {
    try {
      setCalculatingTuyaIds((prev) => new Set(prev).add(device.id));
      const data = await fetchDeviceCurrentMonthCost(device.id);

      upsertTuyaResult({
        deviceId: device.id,
        name: device.name || 'Bez nazwy',
        ratedPowerW: device.ratedPowerW ?? null,
        cost: data.cost ?? 0,
        energyKwh: data.energyKwh ?? data.energy ?? 0,
        month: data.month,
        year: data.year,
      });
    } catch (e) {
      console.error(e);
      alert(
        `Nie udało się policzyć kosztu dla urządzenia: ${
          device.name || device.id
        }`
      );
    } finally {
      setCalculatingTuyaIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const tuyaCalculateForIds = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      setTuyaBulkLoading(true);

      const promises = ids.map(async (id) => {
        const device = tuyaDevices.find((d) => d.id === id);
        if (!device) return null;
        try {
          const data = await fetchDeviceCurrentMonthCost(id);
          return {
            deviceId: id,
            name: device.name || 'Bez nazwy',
            ratedPowerW: device.ratedPowerW ?? null,
            cost: data.cost ?? 0,
            energyKwh: data.energyKwh ?? data.energy ?? 0,
            month: data.month,
            year: data.year,
          };
        } catch (e) {
          console.error('Błąd liczenia kosztu TUYA dla id=' + id, e);
          return null;
        }
      });

      const resolved = await Promise.all(promises);
      const filtered = resolved.filter((r) => r !== null);

      setTuyaResults((prev) => {
        const byId = new Map();
        for (const r of prev) byId.set(r.deviceId, r);
        for (const r of filtered) byId.set(r.deviceId, r);
        return Array.from(byId.values());
      });
    } finally {
      setTuyaBulkLoading(false);
    }
  };

  const handleTuyaCalculateSelected = () => {
    const ids = Array.from(selectedTuyaIds);
    tuyaCalculateForIds(ids);
  };

  const handleTuyaCalculateAll = () => {
    const ids = tuyaDevices.map((d) => d.id);
    tuyaCalculateForIds(ids);
  };

  // ---- TUYA: helpery (estymacja na X godzin) ----

  const parseTuyaHours = () => {
    const h = parseFloat(tuyaEstimateHours);
    if (isNaN(h) || h <= 0) {
      alert('Podaj dodatnią liczbę godzin dla estymacji (Tuya).');
      return null;
    }
    return h;
  };

  const upsertTuyaEstimateResult = (entry) => {
    setTuyaEstimateResults((prev) => {
      const idx = prev.findIndex((r) => r.deviceId === entry.deviceId);
      if (idx === -1) return [...prev, entry];
      const copy = [...prev];
      copy[idx] = entry;
      return copy;
    });
  };

  const handleTuyaEstimateOne = async (device) => {
    const hours = parseTuyaHours();
    if (hours == null) return;

    try {
      setTuyaEstimatingIds((prev) => new Set(prev).add(device.id));
      const data = await estimateDeviceCost(device.id, hours);

      upsertTuyaEstimateResult({
        deviceId: device.id,
        name: device.name || 'Bez nazwy',
        ratedPowerW: device.ratedPowerW ?? null,
        cost: data.cost ?? 0,
        energyKwh: data.energyKwh ?? data.energy ?? 0,
        hours,
      });
    } catch (e) {
      console.error(e);
      alert(
        `Nie udało się oszacować kosztu (Tuya) dla urządzenia: ${
          device.name || device.id
        }`
      );
    } finally {
      setTuyaEstimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const tuyaEstimateForIds = async (ids) => {
    if (!ids || ids.length === 0) return;
    const hours = parseTuyaHours();
    if (hours == null) return;

    try {
      setTuyaEstimateBulkLoading(true);

      const promises = ids.map(async (id) => {
        const device = tuyaDevices.find((d) => d.id === id);
        if (!device) return null;
        try {
          const data = await estimateDeviceCost(id, hours);
          return {
            deviceId: id,
            name: device.name || 'Bez nazwy',
            ratedPowerW: device.ratedPowerW ?? null,
            cost: data.cost ?? 0,
            energyKwh: data.energyKwh ?? data.energy ?? 0,
            hours,
          };
        } catch (e) {
          console.error('Błąd estymacji kosztu (Tuya) dla id=' + id, e);
          return null;
        }
      });

      const resolved = await Promise.all(promises);
      const filtered = resolved.filter((r) => r !== null);

      setTuyaEstimateResults((prev) => {
        const byId = new Map();
        for (const r of prev) byId.set(r.deviceId, r);
        for (const r of filtered) byId.set(r.deviceId, r);
        return Array.from(byId.values());
      });
    } finally {
      setTuyaEstimateBulkLoading(false);
    }
  };

  const handleTuyaEstimateSelected = () => {
    const ids = Array.from(selectedTuyaIds);
    tuyaEstimateForIds(ids);
  };

  const handleTuyaEstimateAll = () => {
    const ids = tuyaDevices.map((d) => d.id);
    tuyaEstimateForIds(ids);
  };

  // ---- ADDITIONAL: helpery ----

  const toggleAdditionalSelected = (id) => {
    setSelectedAdditionalIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const upsertAdditionalResult = (entry) => {
    setAdditionalResults((prev) => {
      const idx = prev.findIndex((r) => r.deviceId === entry.deviceId);
      if (idx === -1) return [...prev, entry];
      const copy = [...prev];
      copy[idx] = entry;
      return copy;
    });
  };

  const handleEstimateFormChange = (e) => {
    const { name, value } = e.target;
    setEstimateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Buduje obiekt params dla GET /additional-device/{id}/estimate:
   *  - HOURS_TOTAL -> { hours: ... }
   *  - DAYS_AVG_PER_DAY -> { days: ..., avgHoursPerDay: ... }
   */
  const buildEstimateQuery = () => {
    const mode = estimateForm.mode;
    if (mode === 'HOURS_TOTAL') {
      const hours = parseFloat(estimateForm.totalHours);
      if (isNaN(hours) || hours <= 0) {
        alert('Podaj dodatnią liczbę godzin (całkowity czas pracy).');
        return null;
      }
      return { hours };
    } else {
      const days = parseInt(estimateForm.days, 10);
      const avgHoursPerDay = parseFloat(estimateForm.avgHoursPerDay);
      if (isNaN(days) || days <= 0) {
        alert('Podaj dodatnią liczbę dni.');
        return null;
      }
      if (isNaN(avgHoursPerDay) || avgHoursPerDay <= 0) {
        alert('Podaj dodatnią liczbę godzin na dzień.');
        return null;
      }
      return { days, avgHoursPerDay };
    }
  };

  const handleAdditionalEstimateOne = async (device) => {
    const query = buildEstimateQuery();
    if (!query) return;

    try {
      setCalculatingAdditionalIds((prev) => new Set(prev).add(device.id));
      const data = await estimateAdditionalDeviceCost(device.id, query);

      upsertAdditionalResult({
        deviceId: device.id,
        name: device.name || 'Bez nazwy',
        ratedPowerW: device.ratedPowerW ?? null,
        cost: data.cost ?? 0,
        energyKwh: data.energyKwh ?? data.energy ?? 0,
        mode: estimateForm.mode,
        extra: data,
      });
    } catch (e) {
      console.error(e);
      alert(
        `Nie udało się oszacować kosztu dla urządzenia: ${
          device.name || device.id
        }`
      );
    } finally {
      setCalculatingAdditionalIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const additionalEstimateForIds = async (ids) => {
    if (!ids || ids.length === 0) return;
    const query = buildEstimateQuery();
    if (!query) return;

    try {
      setAdditionalBulkLoading(true);

      const promises = ids.map(async (id) => {
        const device = additionalDevices.find((d) => d.id === id);
        if (!device) return null;
        try {
          const data = await estimateAdditionalDeviceCost(id, query);
          return {
            deviceId: id,
            name: device.name || 'Bez nazwy',
            ratedPowerW: device.ratedPowerW ?? null,
            cost: data.cost ?? 0,
            energyKwh: data.energyKwh ?? data.energy ?? 0,
            mode: estimateForm.mode,
            extra: data,
          };
        } catch (e) {
          console.error(
            'Błąd estymacji kosztu dla additional id=' + id,
            e
          );
          return null;
        }
      });

      const resolved = await Promise.all(promises);
      const filtered = resolved.filter((r) => r !== null);

      setAdditionalResults((prev) => {
        const byId = new Map();
        for (const r of prev) byId.set(r.deviceId, r);
        for (const r of filtered) byId.set(r.deviceId, r);
        return Array.from(byId.values());
      });
    } finally {
      setAdditionalBulkLoading(false);
    }
  };

  const handleAdditionalEstimateSelected = () => {
    const ids = Array.from(selectedAdditionalIds);
    additionalEstimateForIds(ids);
  };

  const handleAdditionalEstimateAll = () => {
    const ids = additionalDevices.map((d) => d.id);
    additionalEstimateForIds(ids);
  };

  // ---- RENDER ----

  if (loading) {
    return (
      <div className="bg-light min-vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Wczytywanie...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-light min-vh-100">
        <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
          <div className="alert alert-danger mt-3">{error}</div>
        </div>
      </div>
    );
  }

  const anyTuyaSelected = selectedTuyaIds.size > 0;
  const anyAdditionalSelected = selectedAdditionalIds.size > 0;

  return (
    <div className="bg-light min-vh-100">
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="mb-1">Wyliczanie kosztów energii</h2>
            <p className="text-muted mb-0">
              Urządzenia Tuya – koszt na podstawie pomiarów lub estymacja na X
              godzin. Urządzenia dodane ręcznie – szacowanie kosztu na podstawie
              mocy i czasu pracy.
            </p>
          </div>
        </div>

        {/* ---- SEKCJA TUYA ---- */}
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div>
              <h4 className="mb-0">Urządzenia Tuya</h4>
              <small className="text-muted">
                Rzeczywisty koszt za bieżący miesiąc oraz estymacja na
                zadany czas pracy (w godzinach).
              </small>
            </div>

            <div className="d-flex flex-column flex-md-row align-items-md-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 small">
                  Godziny do estymacji:
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control form-control-sm"
                  style={{ width: '80px' }}
                  value={tuyaEstimateHours}
                  onChange={(e) => setTuyaEstimateHours(e.target.value)}
                />
              </div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleTuyaCalculateAll}
                  disabled={tuyaBulkLoading || tuyaDevices.length === 0}
                >
                  {tuyaBulkLoading ? 'Liczenie…' : 'Koszt miesiąca wszystkich'}
                </button>

                {anyTuyaSelected && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleTuyaCalculateSelected}
                    disabled={tuyaBulkLoading}
                  >
                    {tuyaBulkLoading
                      ? 'Liczenie…'
                      : 'Koszt miesiąca zaznaczonych'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={handleTuyaEstimateAll}
                  disabled={
                    tuyaEstimateBulkLoading || tuyaDevices.length === 0
                  }
                >
                  {tuyaEstimateBulkLoading
                    ? 'Szacowanie…'
                    : `Oszacuj ${tuyaEstimateHours || '?'} h (wszyscy)`}
                </button>

                {anyTuyaSelected && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleTuyaEstimateSelected}
                    disabled={tuyaEstimateBulkLoading}
                  >
                    {tuyaEstimateBulkLoading
                      ? 'Szacowanie…'
                      : `Oszacuj ${tuyaEstimateHours || '?'} h (zaznaczeni)`}
                  </button>
                )}

                {anyTuyaSelected && (
                  <span className="text-muted small">
                    Zaznaczono: {selectedTuyaIds.size}
                  </span>
                )}
              </div>
            </div>
          </div>

          {tuyaDevices.length === 0 ? (
            <p className="text-muted">
              Brak urządzeń Tuya. Zsynchronizuj je najpierw w systemie.
            </p>
          ) : (
            <div className="row g-3">
              {tuyaDevices.map((device) => {
                const isSelected = selectedTuyaIds.has(device.id);
                const isCalculatingMonth = calculatingTuyaIds.has(device.id);
                const isEstimatingHours = tuyaEstimatingIds.has(device.id);
                const ratedPower =
                  device.ratedPowerW != null
                    ? `${device.ratedPowerW} W`
                    : 'brak danych';

                return (
                  <div
                    key={device.id}
                    className="col-12 col-sm-6 col-md-4 col-lg-3"
                  >
                    <div className="card shadow-sm h-100">
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="card-title mb-1">
                              {device.name || 'Bez nazwy'}
                            </h6>
                            <p className="card-text text-muted small mb-0">
                              Moc: <strong>{ratedPower}</strong>
                            </p>
                          </div>
                          <div className="form-check ms-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTuyaSelected(device.id)}
                            />
                          </div>
                        </div>

                        <div className="mt-auto d-flex flex-column gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary w-100"
                            onClick={() => handleTuyaCalculateOne(device)}
                            disabled={isCalculatingMonth || tuyaBulkLoading}
                          >
                            {isCalculatingMonth
                              ? 'Liczenie…'
                              : 'Koszt bieżącego miesiąca'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success w-100"
                            onClick={() => handleTuyaEstimateOne(device)}
                            disabled={
                              isEstimatingHours || tuyaEstimateBulkLoading
                            }
                          >
                            {isEstimatingHours
                              ? 'Szacowanie…'
                              : `Oszacuj ${tuyaEstimateHours || '?'} h`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Raport TUYA – miesiąc */}
          <div className="mt-4">
            <h5 className="mb-3">Raport (Tuya – bieżący miesiąc)</h5>
            {tuyaResults.length === 0 ? (
              <p className="text-muted">
                Brak wyników. Użyj przycisków „Koszt miesiąca…”.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Urządzenie</th>
                      <th>Moc [W]</th>
                      <th>Energia [kWh]</th>
                      <th>Koszt</th>
                      <th>Miesiąc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tuyaResults.map((r) => (
                      <tr key={r.deviceId}>
                        <td>{r.name}</td>
                        <td>{r.ratedPowerW != null ? r.ratedPowerW : '-'}</td>
                        <td>
                          {r.energyKwh != null ? r.energyKwh.toFixed(3) : '-'}
                        </td>
                        <td>
                          {r.cost != null ? r.cost.toFixed(2) + ' zł' : '-'}
                        </td>
                        <td>
                          {r.month != null && r.year != null
                            ? `${r.month}.${r.year}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Raport TUYA – estymacja godzinowa */}
          <div className="mt-4">
            <h5 className="mb-3">Raport (Tuya – estymacja na X godzin)</h5>
            {tuyaEstimateResults.length === 0 ? (
              <p className="text-muted">
                Brak wyników. Użyj przycisków „Oszacuj … h”.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Urządzenie</th>
                      <th>Moc [W]</th>
                      <th>Godzin</th>
                      <th>Energia [kWh]</th>
                      <th>Koszt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tuyaEstimateResults.map((r) => (
                      <tr key={r.deviceId}>
                        <td>{r.name}</td>
                        <td>{r.ratedPowerW != null ? r.ratedPowerW : '-'}</td>
                        <td>{r.hours != null ? r.hours : '-'}</td>
                        <td>
                          {r.energyKwh != null ? r.energyKwh.toFixed(3) : '-'}
                        </td>
                        <td>
                          {r.cost != null ? r.cost.toFixed(2) + ' zł' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ---- SEKCJA ADDITIONAL ---- (bez zmian logiki, tylko poniżej) */}
        <section>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h4 className="mb-0">Urządzenia dodane ręcznie</h4>
              <small className="text-muted">
                Szacowanie kosztu na podstawie mocy i założonego czasu pracy.
              </small>
            </div>
          </div>

          {/* Formularz estymacji */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="card-title mb-3">Parametry estymacji</h6>
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="form-label">Tryb</label>
                  <select
                    className="form-select"
                    name="mode"
                    value={estimateForm.mode}
                    onChange={handleEstimateFormChange}
                  >
                    <option value="DAYS_AVG_PER_DAY">
                      Dni + średnie godziny dziennie
                    </option>
                    <option value="HOURS_TOTAL">Całkowita liczba godzin</option>
                  </select>
                </div>

                {estimateForm.mode === 'HOURS_TOTAL' ? (
                  <div className="col-12 col-md-4">
                    <label className="form-label">Liczba godzin</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      name="totalHours"
                      value={estimateForm.totalHours}
                      onChange={handleEstimateFormChange}
                      placeholder="np. 120"
                    />
                  </div>
                ) : (
                  <>
                    <div className="col-12 col-md-3">
                      <label className="form-label">Liczba dni</label>
                      <input
                        type="number"
                        className="form-control"
                        name="days"
                        value={estimateForm.days}
                        onChange={handleEstimateFormChange}
                        placeholder="np. 30"
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label">
                        Średnio godzin dziennie
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        name="avgHoursPerDay"
                        value={estimateForm.avgHoursPerDay}
                        onChange={handleEstimateFormChange}
                        placeholder="np. 4"
                      />
                    </div>
                  </>
                )}

                <div className="col-12 col-md-5 col-lg-4 d-flex flex-wrap gap-2 mt-2 mt-md-0">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleAdditionalEstimateAll}
                    disabled={
                      additionalBulkLoading || additionalDevices.length === 0
                    }
                  >
                    {additionalBulkLoading
                      ? 'Szacowanie…'
                      : 'Oszacuj koszt wszystkich'}
                  </button>

                  {anyAdditionalSelected && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAdditionalEstimateSelected}
                      disabled={additionalBulkLoading}
                    >
                      {additionalBulkLoading
                        ? 'Szacowanie…'
                        : 'Oszacuj koszt zaznaczonych'}
                    </button>
                  )}

                  {anyAdditionalSelected && (
                    <span className="text-muted small align-self-center">
                      Zaznaczono: {selectedAdditionalIds.size}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kafelki ADDITIONAL */}
          {additionalDevices.length === 0 ? (
            <p className="text-muted">
              Brak urządzeń dodanych ręcznie. Dodaj je w sekcji „Zarządzaj
              dodanymi urządzeniami”.
            </p>
          ) : (
            <div className="row g-3">
              {additionalDevices.map((device) => {
                const isSelected = selectedAdditionalIds.has(device.id);
                const isCalculating = calculatingAdditionalIds.has(device.id);
                const ratedPower =
                  device.ratedPowerW != null
                    ? `${device.ratedPowerW} W`
                    : 'brak danych';

                return (
                  <div
                    key={device.id}
                    className="col-12 col-sm-6 col-md-4 col-lg-3"
                  >
                    <div className="card shadow-sm h-100">
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="card-title mb-1">
                              {device.name || 'Bez nazwy'}
                            </h6>
                            <p className="card-text text-muted small mb-0">
                              Moc: <strong>{ratedPower}</strong>
                            </p>
                          </div>
                          <div className="form-check ms-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleAdditionalSelected(device.id)
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-auto">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary w-100"
                            onClick={() => handleAdditionalEstimateOne(device)}
                            disabled={isCalculating || additionalBulkLoading}
                          >
                            {isCalculating ? 'Szacowanie…' : 'Oszacuj koszt'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Raport ADDITIONAL */}
          <div className="mt-4">
            <h5 className="mb-3">Raport (urządzenia dodane ręcznie)</h5>
            {additionalResults.length === 0 ? (
              <p className="text-muted">
                Brak wyników. Ustaw parametry estymacji powyżej i użyj
                przycisków „Oszacuj koszt…”.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Urządzenie</th>
                      <th>Moc [W]</th>
                      <th>Energia [kWh]</th>
                      <th>Koszt</th>
                      <th>Tryb</th>
                    </tr>
                  </thead>
                  <tbody>
                    {additionalResults.map((r) => (
                      <tr key={r.deviceId}>
                        <td>{r.name}</td>
                        <td>
                          {r.ratedPowerW != null ? r.ratedPowerW : '-'}
                        </td>
                        <td>
                          {r.energyKwh != null ? r.energyKwh.toFixed(3) : '-'}
                        </td>
                        <td>
                          {r.cost != null ? r.cost.toFixed(2) + ' zł' : '-'}
                        </td>
                        <td>{r.mode || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CostCalculator;
