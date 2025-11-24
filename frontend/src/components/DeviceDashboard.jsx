// src/components/DeviceDashboard.jsx
import React, { useEffect, useState } from 'react';
import { fetchAllDevices } from '../api/deviceApi';

function DeviceDashboard() {
  const [tuyaDevices, setTuyaDevices] = useState([]);
  const [additionalDevices, setAdditionalDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🆕 zamiast jednego ID – lista kluczy, które są rozwinięte
  // klucze mają postać: 'TUYA-<id>' lub 'ADDITIONAL-<id>'
  const [expandedKeys, setExpandedKeys] = useState([]);

  // drag & drop
  const [dragState, setDragState] = useState(null); // { section: 'TUYA' | 'ADDITIONAL', index: number }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchAllDevices();

        const tuya = data.filter((d) => d.source === 'TUYA');
        const additional = data.filter((d) => d.source === 'ADDITIONAL');

        // odtwórz kolejność z localStorage
        const tuyaOrder = JSON.parse(
          localStorage.getItem('dashboardTuyaOrder') || '[]'
        );
        const additionalOrder = JSON.parse(
          localStorage.getItem('dashboardAdditionalOrder') || '[]'
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

        setTuyaDevices(sortByOrder(tuya, tuyaOrder));
        setAdditionalDevices(sortByOrder(additional, additionalOrder));
      } catch (e) {
        console.error(e);
        setError('Nie udało się pobrać listy urządzeń.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 🆕 toggle dla wielu rozwiniętych kafelków
  const toggleExpanded = (source, id) => {
    const key = `${source}-${id}`;
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // --- DRAG & DROP ---

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
          'dashboardTuyaOrder',
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
          'dashboardAdditionalOrder',
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

  const renderTuyaCard = (device, index) => {
    const key = `TUYA-${device.id}`;
    const isExpanded = expandedKeys.includes(key);
    const isDragging =
      dragState && dragState.section === 'TUYA' && dragState.index === index;

    let categoryLabel = 'Urządzenie';
    if (device.category === 'cz') categoryLabel = 'Gniazdko';
    else if (device.category === 'qt') categoryLabel = 'Czujnik';
    else if (device.category === 'dj') categoryLabel = 'Oświetlenie';

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
                  {categoryLabel} ({device.category || '-'})
                </small>
              </div>
            </div>
            <span
              className={
                'badge ' + (device.online ? 'bg-success' : 'bg-secondary')
              }
            >
              {device.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="card-body d-flex flex-column">
            <p className="text-muted small mb-2">
              Źródło: <span className="fw-semibold">Tuya</span>
            </p>

            {device.ratedPowerW != null && (
              <p className="text-muted small mb-1">
                Moc znamionowa:{' '}
                <span className="fw-semibold">
                  {device.ratedPowerW.toFixed(1)} W
                </span>
              </p>
            )}

            {device.description && (
              <p className="text-muted small mb-1">
                Opis: <span className="fw-semibold">{device.description}</span>
              </p>
            )}

            <button
              type="button"
              className="btn btn-sm btn-outline-primary mt-auto"
              onClick={() => toggleExpanded('TUYA', device.id)}
            >
              {isExpanded ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
            </button>

            {isExpanded && (
              <div className="mt-3 border-top pt-2 small text-muted">
                <div>
                  <span className="fw-semibold">Model:</span>{' '}
                  {device.model || '—'}
                </div>
                <div>
                  <span className="fw-semibold">IP:</span>{' '}
                  {device.ip || '—'}
                </div>
                <div>
                  <span className="fw-semibold">Ostatnia aktualizacja:</span>{' '}
                  {device.lastUpdate
                    ? new Date(device.lastUpdate).toLocaleString('pl-PL')
                    : '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdditionalCard = (device, index) => {
    const key = `ADDITIONAL-${device.id}`;
    const isExpanded = expandedKeys.includes(key);
    const isDragging =
      dragState &&
      dragState.section === 'ADDITIONAL' &&
      dragState.index === index;

    // 🆕 obsłuż różne nazwy pól z backendu: createdAt / created_at
    const created =
      device.createdAt ||
      device.created_at ||
      device.created ||
      null;
    const updated =
      device.updatedAt ||
      device.updated_at ||
      device.updated ||
      null;

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
            <span className="badge bg-info text-dark">ADDITIONAL</span>
          </div>
          <div className="card-body d-flex flex-column">
            {device.ratedPowerW != null && (
              <p className="text-muted small mb-1">
                Moc znamionowa:{' '}
                <span className="fw-semibold">
                  {device.ratedPowerW.toFixed(1)} W
                </span>
              </p>
            )}

            {device.description && (
              <p className="text-muted small mb-2">
                {device.description}
              </p>
            )}

            <button
              type="button"
              className="btn btn-sm btn-outline-primary mt-auto"
              onClick={() => toggleExpanded('ADDITIONAL', device.id)}
            >
              {isExpanded ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
            </button>

            {isExpanded && (
              <div className="mt-3 border-top pt-2 small text-muted">
                <div>
                  <span className="fw-semibold">Dodano:</span>{' '}
                  {created
                    ? new Date(created).toLocaleString('pl-PL')
                    : '—'}
                </div>
                <div>
                  <span className="fw-semibold">Ostatnia modyfikacja:</span>{' '}
                  {updated
                    ? new Date(updated).toLocaleString('pl-PL')
                    : '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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

  return (
    <div className="bg-light min-vh-100">
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="mb-1">Dashboard urządzeń</h2>
            <p className="text-muted mb-0">
              Przeciągaj kafelki, aby ustawić własną kolejność. Dane są
              pobierane z Tuya oraz z ręcznie dodanych urządzeń.
            </p>
          </div>
        </div>

        {/* TUYA */}
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Urządzenia Tuya</h4>
            <span className="badge bg-dark-subtle text-dark">
              {tuyaDevices.length} urządzeń
            </span>
          </div>
          {tuyaDevices.length === 0 ? (
            <p className="text-muted">Brak urządzeń Tuya.</p>
          ) : (
            <div className="row g-3">
              {tuyaDevices.map((d, index) => renderTuyaCard(d, index))}
            </div>
          )}
        </section>

        {/* ADDITIONAL */}
        <section>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Urządzenia dodane ręcznie</h4>
            <span className="badge bg-dark-subtle text-dark">
              {additionalDevices.length} urządzeń
            </span>
          </div>
          {additionalDevices.length === 0 ? (
            <p className="text-muted">
              Brak urządzeń dodanych ręcznie. Możesz dodać je w sekcji „Zarządzaj
              dodanymi urządzeniami”.
            </p>
          ) : (
            <div className="row g-3">
              {additionalDevices.map((d, index) =>
                renderAdditionalCard(d, index)
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DeviceDashboard;
