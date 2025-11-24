// src/components/CostCalculator.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchAllDevices,
  estimateDeviceCost,
  estimateAdditionalDeviceCost,
  updateBulbDetails,
} from '../api/deviceApi';

function CostCalculator() {
  const [tuyaDevices, setTuyaDevices] = useState([]);
  const [additionalDevices, setAdditionalDevices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const [tuyaEstimates, setTuyaEstimates] = useState({});
  const [additionalEstimates, setAdditionalEstimates] = useState({});

  const [selectedTuyaIds, setSelectedTuyaIds] = useState([]);
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState([]);

  // edycja Tuya
  const [editingBulbDeviceId, setEditingBulbDeviceId] = useState(null);
  const [bulbForm, setBulbForm] = useState({
    bulbDescription: '',
    ratedPowerW: '',
  });
  const [savingBulb, setSavingBulb] = useState(false);

  // drag & drop
  const [dragState, setDragState] = useState(null); // { section: 'TUYA' | 'ADDITIONAL', index: number }

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      const data = await fetchAllDevices();

      const tuya = data.filter((d) => d.source === 'TUYA');
      const additional = data.filter((d) => d.source === 'ADDITIONAL');

      // odtwórz kolejność z localStorage
      const tuyaOrder = JSON.parse(
        localStorage.getItem('estimationTuyaOrder') || '[]'
      );
      const additionalOrder = JSON.parse(
        localStorage.getItem('estimationAdditionalOrder') || '[]'
      );

      const sortByOrder = (arr, order) => {
        if (!order || order.length === 0) return arr;
        return [...arr].sort((a, b) => {
          const ia = order.indexOf(a.id);
          const ib = order.indexOf(b.id);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
      };

      const tuyaSorted = sortByOrder(tuya, tuyaOrder);
      const additionalSorted = sortByOrder(additional, additionalOrder);

      setTuyaDevices(tuyaSorted);
      setAdditionalDevices(additionalSorted);

      // domyślne estymacje
      const tuyaDefaults = {};
      tuyaSorted.forEach((d) => {
        tuyaDefaults[d.id] = {
          hours: 24,
          energyKwh: null,
          cost: null,
          ratePerKwh: null,
          ratedPowerW: d.ratedPowerW ?? null,
        };
      });
      setTuyaEstimates(tuyaDefaults);

      const addDefaults = {};
      additionalSorted.forEach((d) => {
        addDefaults[d.id] = {
          mode: 'HOURS',
          hours: 24,
          days: 1,
          avgHoursPerDay: 1,
          energyKwh: null,
          cost: null,
          ratePerKwh: null,
          ratedPowerW: d.ratedPowerW ?? null,
        };
      });
      setAdditionalEstimates(addDefaults);

      setSelectedTuyaIds([]);
      setSelectedAdditionalIds([]);
    } catch (e) {
      console.error(e);
      setError('Nie udało się pobrać listy urządzeń.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  // ----- zaznaczanie -----

  const toggleSelectTuya = (id) => {
    setSelectedTuyaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAdditional = (id) => {
    setSelectedAdditionalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ----- edycja Tuya -----

  const startEditBulb = (device) => {
    setEditingBulbDeviceId(device.id);
    setBulbForm({
      bulbDescription: device.description || '',
      ratedPowerW:
        device.ratedPowerW != null ? String(device.ratedPowerW) : '',
    });
    setInfoMessage(null);
    setError(null);
  };

  const cancelEditBulb = () => {
    setEditingBulbDeviceId(null);
    setBulbForm({
      bulbDescription: '',
      ratedPowerW: '',
    });
  };

  const handleBulbFormChange = (e) => {
    const { name, value } = e.target;
    setBulbForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveBulbDetails = async () => {
    if (!editingBulbDeviceId) return;

    const payload = {};
    if (bulbForm.bulbDescription.trim() !== '') {
      payload.bulbDescription = bulbForm.bulbDescription.trim();
    } else {
      payload.bulbDescription = null;
    }

    if (bulbForm.ratedPowerW.trim() !== '') {
      const parsed = parseFloat(bulbForm.ratedPowerW);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Podaj dodatnią wartość mocy w watach (W).');
        return;
      }
      payload.ratedPowerW = parsed;
    } else {
      payload.ratedPowerW = null;
    }

    try {
      setSavingBulb(true);
      setError(null);
      setInfoMessage(null);

      await updateBulbDetails(editingBulbDeviceId, payload);

      await loadDevices();

      setInfoMessage('Dane urządzenia Tuya zostały zaktualizowane.');
      cancelEditBulb();
    } catch (e) {
      console.error(e);
      setError('Nie udało się zaktualizować danych urządzenia Tuya.');
    } finally {
      setSavingBulb(false);
    }
  };

  // ----- estymacja TUYA -----

  const handleTuyaHoursChange = (deviceId, value) => {
    setTuyaEstimates((prev) => ({
      ...prev,
      [deviceId]: {
        ...(prev[deviceId] || {}),
        hours: value,
      },
    }));
  };

  const estimateTuyaSingle = async (deviceId) => {
    try {
      setError(null);
      setInfoMessage(null);

      const current = tuyaEstimates[deviceId] || { hours: 24 };
      const hoursNum = parseFloat(current.hours);

      if (isNaN(hoursNum) || hoursNum <= 0) {
        alert('Podaj dodatnią liczbę godzin.');
        return;
      }

      const data = await estimateDeviceCost(deviceId, hoursNum);

      setTuyaEstimates((prev) => ({
        ...prev,
        [deviceId]: {
          ...(prev[deviceId] || {}),
          hours: hoursNum,
          energyKwh: Number(data.energyKwh ?? data.energy ?? 0),
          cost: Number(data.cost ?? 0),
          ratePerKwh: Number(data.ratePerKwh ?? data.rate ?? 0),
          ratedPowerW:
            data.ratedPowerW != null
              ? Number(data.ratedPowerW)
              : prev[deviceId]?.ratedPowerW ?? null,
        },
      }));
    } catch (e) {
      console.error(e);
      setError('Nie udało się obliczyć estymacji dla urządzenia Tuya.');
    }
  };

  // ----- estymacja ADDITIONAL -----

  const handleAdditionalModeChange = (deviceId, mode) => {
    setAdditionalEstimates((prev) => ({
      ...prev,
      [deviceId]: {
        ...(prev[deviceId] || {}),
        mode,
      },
    }));
  };

  const handleAdditionalFieldChange = (deviceId, field, value) => {
    setAdditionalEstimates((prev) => ({
      ...prev,
      [deviceId]: {
        ...(prev[deviceId] || {}),
        [field]: value,
      },
    }));
  };

  const estimateAdditionalSingle = async (deviceId) => {
    try {
      setError(null);
      setInfoMessage(null);

      const current = additionalEstimates[deviceId] || {
        mode: 'HOURS',
        hours: 24,
        days: 1,
        avgHoursPerDay: 1,
      };

      const params = {};
      if (current.mode === 'HOURS') {
        const h = parseFloat(current.hours);
        if (isNaN(h) || h <= 0) {
          alert('Podaj dodatnią liczbę godzin.');
          return;
        }
        params.hours = h;
      } else {
        const d = parseInt(current.days, 10);
        const avg = parseFloat(current.avgHoursPerDay);
        if (isNaN(d) || d <= 0 || isNaN(avg) || avg <= 0) {
          alert('Podaj dodatnie wartości dni i średnich godzin.');
          return;
        }
        params.days = d;
        params.avgHoursPerDay = avg;
      }

      const data = await estimateAdditionalDeviceCost(deviceId, params);

      setAdditionalEstimates((prev) => ({
        ...prev,
        [deviceId]: {
          ...(prev[deviceId] || {}),
          energyKwh: Number(data.energyKwh ?? 0),
          cost: Number(data.cost ?? 0),
          ratePerKwh: Number(data.ratePerKwh ?? data.rate ?? 0),
          ratedPowerW:
            data.ratedPowerW != null
              ? Number(data.ratedPowerW)
              : prev[deviceId]?.ratedPowerW ?? null,
        },
      }));
    } catch (e) {
      console.error(e);
      setError(
        'Nie udało się obliczyć estymacji dla urządzenia dodanego ręcznie.'
      );
    }
  };

  // ----- estymacja zbiorcza -----

  const estimateSelected = async () => {
    try {
      setError(null);
      setInfoMessage(null);

      for (const id of selectedTuyaIds) {
        // eslint-disable-next-line no-await-in-loop
        await estimateTuyaSingle(id);
      }

      for (const id of selectedAdditionalIds) {
        // eslint-disable-next-line no-await-in-loop
        await estimateAdditionalSingle(id);
      }

      setInfoMessage('Wyliczono koszt dla zaznaczonych urządzeń.');
    } catch (e) {
      console.error(e);
      setError('Wystąpił błąd podczas wyliczania dla zaznaczonych.');
    }
  };

  const estimateAll = async () => {
    try {
      setError(null);
      setInfoMessage(null);

      for (const d of tuyaDevices) {
        // eslint-disable-next-line no-await-in-loop
        await estimateTuyaSingle(d.id);
      }

      for (const d of additionalDevices) {
        // eslint-disable-next-line no-await-in-loop
        await estimateAdditionalSingle(d.id);
      }

      setInfoMessage('Wyliczono koszt dla wszystkich urządzeń.');
    } catch (e) {
      console.error(e);
      setError('Wystąpił błąd podczas wyliczania dla wszystkich urządzeń.');
    }
  };

  // ----- DRAG & DROP -----

  const handleDragStart = (section, index) => {
    setDragState({ section, index });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (section, dropIndex) => {
    if (!dragState || dragState.section !== section) return;

    if (section === 'TUYA') {
      setTuyaDevices((prev) => {
        const arr = [...prev];
        const draggedItem = arr[dragState.index];
        arr.splice(dragState.index, 1);
        arr.splice(dropIndex, 0, draggedItem);
        localStorage.setItem(
          'estimationTuyaOrder',
          JSON.stringify(arr.map((d) => d.id))
        );
        return arr;
      });
    } else if (section === 'ADDITIONAL') {
      setAdditionalDevices((prev) => {
        const arr = [...prev];
        const draggedItem = arr[dragState.index];
        arr.splice(dragState.index, 1);
        arr.splice(dropIndex, 0, draggedItem);
        localStorage.setItem(
          'estimationAdditionalOrder',
          JSON.stringify(arr.map((d) => d.id))
        );
        return arr;
      });
    }

    setDragState(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
  };

  // ----- render -----

  if (loading) {
    return (
      <div className="bg-light min-vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Wczytywanie...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="mb-1">Estymacja kosztów energii</h2>
            <p className="text-muted mb-0">
              Przeciągaj kafelki, aby ustawić własną kolejność. Zaznacz
              urządzenia checkboxami, aby policzyć wspólnie, lub wylicz koszt
              pojedynczego kafelka.
            </p>
          </div>

          <div className="d-flex flex-column flex-sm-row gap-2">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={estimateSelected}
              disabled={
                selectedTuyaIds.length === 0 &&
                selectedAdditionalIds.length === 0
              }
            >
              Wylicz koszt zaznaczonych
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={estimateAll}
              disabled={
                tuyaDevices.length === 0 && additionalDevices.length === 0
              }
            >
              Wylicz koszt wszystkich
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="alert alert-success" role="alert">
            {infoMessage}
          </div>
        )}

        <div className="mb-3 small text-muted">
          Zaznaczone: TUYA {selectedTuyaIds.length}, ADDITIONAL{' '}
          {selectedAdditionalIds.length}
        </div>

        {/* --- TUYA --- */}
        <section className="mb-5">
          <h4 className="mb-3">Urządzenia Tuya</h4>
          {tuyaDevices.length === 0 ? (
            <p className="text-muted">
              Brak urządzeń Tuya. Sprawdź integrację z backendem.
            </p>
          ) : (
            <div className="row g-3">
              {tuyaDevices.map((device, index) => {
                const est = tuyaEstimates[device.id] || {};
                const isEditing = editingBulbDeviceId === device.id;
                const selected = selectedTuyaIds.includes(device.id);
                const isDragging =
                  dragState &&
                  dragState.section === 'TUYA' &&
                  dragState.index === index;

                const category = device.category || '-';
                let deviceKindLabel = 'Urządzenie';
                let descriptionLabel = 'Opis urządzenia';
                if (category === 'cz') {
                  deviceKindLabel = 'Gniazdko';
                  descriptionLabel = 'Opis gniazdka';
                } else if (category === 'qt') {
                  deviceKindLabel = 'Czujnik';
                  descriptionLabel = 'Opis czujnika';
                } else if (category === 'dj') {
                  deviceKindLabel = 'Oświetlenie';
                  descriptionLabel = 'Opis lampy';
                }

                return (
                  <div
                    key={device.id}
                    className="col-12 col-sm-6 col-md-4 col-lg-3"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop('TUYA', index)}
                  >
                    <div
                      className={
                        'card shadow-sm h-100 card-hover card-draggable ' +
                        (isDragging ? 'card-dragging' : '')
                      }
                      draggable
                      onDragStart={() => handleDragStart('TUYA', index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="card-header d-flex justify-content-between align-items-center bg-gradient-primary text-white py-2">
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            className="form-check-input mt-0"
                            checked={selected}
                            onChange={() => toggleSelectTuya(device.id)}
                          />
                          <span
                            className="drag-handle"
                            title="Przeciągnij, aby zmienić kolejność"
                          >
                            ☰
                          </span>
                          <div>
                            <div className="fw-semibold text-truncate">
                              {device.name || 'Bez nazwy'}
                            </div>
                            <small className="opacity-75">
                              {deviceKindLabel} ({category})
                            </small>
                          </div>
                        </div>
                        <span
                          className={
                            'badge ' +
                            (device.online ? 'bg-success' : 'bg-secondary')
                          }
                        >
                          {device.online ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="card-body d-flex flex-column">
                        <p className="card-text text-muted small mb-1">
                          Źródło: <strong>Tuya</strong>
                        </p>

                        <p className="card-text text-muted small mb-1">
                          Moc znamionowa:{' '}
                          <strong>
                            {device.ratedPowerW != null
                              ? `${device.ratedPowerW} W`
                              : 'nie ustawiono'}
                          </strong>
                        </p>

                        <p className="card-text text-muted small mb-2">
                          {descriptionLabel}:{' '}
                          <strong>
                            {device.description
                              ? device.description
                              : 'brak opisu'}
                          </strong>
                        </p>

                        {isEditing && (
                          <div className="mt-2 p-2 border rounded bg-light-subtle">
                            <h6 className="small fw-semibold mb-2">
                              Edytuj parametry (
                              {deviceKindLabel.toLowerCase()})
                            </h6>

                            <div className="mb-2">
                              <label className="form-label small mb-1">
                                {descriptionLabel}
                              </label>
                              <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                name="bulbDescription"
                                value={bulbForm.bulbDescription}
                                onChange={handleBulbFormChange}
                              />
                            </div>

                            <div className="mb-2">
                              <label className="form-label small mb-1">
                                Moc znamionowa [W]
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="form-control form-control-sm"
                                name="ratedPowerW"
                                value={bulbForm.ratedPowerW}
                                onChange={handleBulbFormChange}
                                placeholder="np. 8, 35, 120"
                              />
                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={cancelEditBulb}
                                disabled={savingBulb}
                              >
                                Anuluj
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={saveBulbDetails}
                                disabled={savingBulb}
                              >
                                {savingBulb ? 'Zapisywanie…' : 'Zapisz'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <h6 className="small fw-semibold mb-2">
                            Estymacja kosztu
                          </h6>
                          <div className="mb-2">
                            <label className="form-label small mb-1">
                              Godziny pracy
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="form-control form-control-sm"
                              value={est.hours ?? ''}
                              onChange={(e) =>
                                handleTuyaHoursChange(
                                  device.id,
                                  e.target.value
                                )
                              }
                              placeholder="np. 24"
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary w-100"
                            onClick={() => estimateTuyaSingle(device.id)}
                          >
                            Wylicz koszt
                          </button>

                          {est.energyKwh != null && (
                            <div className="mt-2 small text-muted">
                              <div>
                                Energia:{' '}
                                <strong>
                                  {est.energyKwh.toFixed(3)} kWh
                                </strong>
                              </div>
                              <div>
                                Koszt:{' '}
                                <strong>{est.cost.toFixed(2)} zł</strong>
                              </div>
                              {est.ratePerKwh != null && (
                                <div>
                                  Stawka:{' '}
                                  <strong>
                                    {est.ratePerKwh.toFixed(2)} zł/kWh
                                  </strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="mt-auto pt-2 d-grid">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => startEditBulb(device)}
                            >
                              Edytuj parametry{' '}
                              {deviceKindLabel.toLowerCase()}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* --- ADDITIONAL --- */}
        <section>
          <h4 className="mb-3">Urządzenia dodane ręcznie</h4>
          {additionalDevices.length === 0 ? (
            <p className="text-muted">
              Brak urządzeń dodanych ręcznie. Dodaj je w sekcji zarządzania
              urządzeniami.
            </p>
          ) : (
            <div className="row g-3">
              {additionalDevices.map((device, index) => {
                const est = additionalEstimates[device.id] || {
                  mode: 'HOURS',
                  hours: 24,
                  days: 1,
                  avgHoursPerDay: 1,
                };
                const selected = selectedAdditionalIds.includes(device.id);
                const isDragging =
                  dragState &&
                  dragState.section === 'ADDITIONAL' &&
                  dragState.index === index;

                return (
                  <div
                    key={device.id}
                    className="col-12 col-sm-6 col-md-4 col-lg-3"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop('ADDITIONAL', index)}
                  >
                    <div
                      className={
                        'card shadow-sm h-100 card-hover card-draggable ' +
                        (isDragging ? 'card-dragging' : '')
                      }
                      draggable
                      onDragStart={() => handleDragStart('ADDITIONAL', index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="card-header d-flex justify-content-between align-items-center bg-gradient-secondary text-white py-2">
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            className="form-check-input mt-0"
                            checked={selected}
                            onChange={() =>
                              toggleSelectAdditional(device.id)
                            }
                          />
                          <span
                            className="drag-handle"
                            title="Przeciągnij, aby zmienić kolejność"
                          >
                            ☰
                          </span>
                          <div>
                            <div className="fw-semibold text-truncate">
                              {device.name || 'Bez nazwy'}
                            </div>
                            <small className="opacity-75">
                              Kategoria: {device.category || '-'}
                            </small>
                          </div>
                        </div>
                        <span className="badge bg-info text-dark">
                          ADDITIONAL
                        </span>
                      </div>

                      <div className="card-body d-flex flex-column">
                        {device.ratedPowerW != null && (
                          <p className="card-text text-muted small mb-1">
                            Moc znamionowa:{' '}
                            <strong>{device.ratedPowerW} W</strong>
                          </p>
                        )}

                        {device.description && (
                          <p className="card-text text-muted small mb-2">
                            {device.description}
                          </p>
                        )}

                        <div className="mt-2">
                          <h6 className="small fw-semibold mb-2">
                            Estymacja kosztu
                          </h6>

                          <div className="mb-2">
                            <div className="form-check form-check-inline">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`mode-${device.id}`}
                                id={`mode-hours-${device.id}`}
                                checked={est.mode === 'HOURS'}
                                onChange={() =>
                                  handleAdditionalModeChange(
                                    device.id,
                                    'HOURS'
                                  )
                                }
                              />
                              <label
                                className="form-check-label small"
                                htmlFor={`mode-hours-${device.id}`}
                              >
                                Łączna liczba godzin
                              </label>
                            </div>
                            <div className="form-check form-check-inline">
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`mode-${device.id}`}
                                id={`mode-days-${device.id}`}
                                checked={est.mode === 'DAYS_AVG'}
                                onChange={() =>
                                  handleAdditionalModeChange(
                                    device.id,
                                    'DAYS_AVG'
                                  )
                                }
                              />
                              <label
                                className="form-check-label small"
                                htmlFor={`mode-days-${device.id}`}
                              >
                                Dni × średnie godziny/dzień
                              </label>
                            </div>
                          </div>

                          {est.mode === 'HOURS' ? (
                            <div className="mb-2">
                              <label className="form-label small mb-1">
                                Godziny (łącznie)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                className="form-control form-control-sm"
                                value={est.hours ?? ''}
                                onChange={(e) =>
                                  handleAdditionalFieldChange(
                                    device.id,
                                    'hours',
                                    e.target.value
                                  )
                                }
                                placeholder="np. 24"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="mb-2">
                                <label className="form-label small mb-1">
                                  Liczba dni
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  className="form-control form-control-sm"
                                  value={est.days ?? ''}
                                  onChange={(e) =>
                                    handleAdditionalFieldChange(
                                      device.id,
                                      'days',
                                      e.target.value
                                    )
                                  }
                                  placeholder="np. 30"
                                />
                              </div>
                              <div className="mb-2">
                                <label className="form-label small mb-1">
                                  Średnie godziny/dzień
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  className="form-control form-control-sm"
                                  value={est.avgHoursPerDay ?? ''}
                                  onChange={(e) =>
                                    handleAdditionalFieldChange(
                                      device.id,
                                      'avgHoursPerDay',
                                      e.target.value
                                    )
                                  }
                                  placeholder="np. 5"
                                />
                              </div>
                            </>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary w-100"
                            onClick={() => estimateAdditionalSingle(device.id)}
                          >
                            Wylicz koszt
                          </button>

                          {est.energyKwh != null && (
                            <div className="mt-2 small text-muted">
                              <div>
                                Energia:{' '}
                                <strong>
                                  {est.energyKwh.toFixed(3)} kWh
                                </strong>
                              </div>
                              <div>
                                Koszt:{' '}
                                <strong>{est.cost.toFixed(2)} zł</strong>
                              </div>
                              {est.ratePerKwh != null && (
                                <div>
                                  Stawka:{' '}
                                  <strong>
                                    {est.ratePerKwh.toFixed(2)} zł/kWh
                                  </strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CostCalculator;
