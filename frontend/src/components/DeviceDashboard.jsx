// frontend/src/components/DeviceDashboard.jsx
import React, { useEffect, useState } from 'react';
import { fetchAllDevices, fetchAdditionalDevice } from '../api/deviceApi';

function DeviceDashboard() {
  const [tuyaDevices, setTuyaDevices] = useState([]);
  const [additionalDevices, setAdditionalDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailsData, setDetailsData] = useState(null);

  useEffect(() => {
    async function loadDevices() {
      try {
        setLoading(true);
        setError(null);
        const devices = await fetchAllDevices();

        const tuya = devices.filter((d) => d.source === 'TUYA');
        const additional = devices.filter((d) => d.source === 'ADDITIONAL');

        setTuyaDevices(tuya);
        setAdditionalDevices(additional);
      } catch (e) {
        console.error(e);
        setError('Nie udało się pobrać listy urządzeń.');
      } finally {
        setLoading(false);
      }
    }

    loadDevices();
  }, []);

  const openDetails = async (device) => {
    setSelectedDevice(device);
    setDetailsData(null);
    setDetailsError(null);
    setShowDetails(true);

    if (device.source === 'ADDITIONAL') {
      try {
        setDetailsLoading(true);
        const data = await fetchAdditionalDevice(device.id);
        setDetailsData(data);
      } catch (e) {
        console.error(e);
        setDetailsError('Nie udało się pobrać szczegółów urządzenia.');
      } finally {
        setDetailsLoading(false);
      }
    } else {
      setDetailsLoading(false);
      setDetailsData(null);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedDevice(null);
    setDetailsData(null);
    setDetailsError(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Wczytywanie...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const renderDeviceCard = (device) => {
    const isOnline = device.source === 'TUYA' ? device.online === true : null;
    const hasPower = device.ratedPowerW != null;

    return (
      <div
        key={`${device.source}-${device.id}`}
        className="col-12 col-md-6 col-lg-4 mb-3"
      >
        <div className="card shadow-sm h-100 border-0">
          <div className="card-body d-flex flex-column">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h5 className="card-title mb-0">
                {device.name || 'Bez nazwy'}
              </h5>
              <span
                className={`badge ${
                  device.source === 'TUYA' ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                {device.source === 'TUYA' ? 'Tuya' : 'Manual'}
              </span>
            </div>

            <p className="card-text text-muted small mb-2">
              Kategoria: <strong>{device.category || 'brak'}</strong>
            </p>

            {device.description && (
              <p className="card-text small mb-2">{device.description}</p>
            )}

            {hasPower && (
              <p className="card-text small mb-2">
                <span className="text-muted">Moc znamionowa:&nbsp;</span>
                <strong>{device.ratedPowerW} W</strong>
              </p>
            )}

            {device.source === 'TUYA' && (
              <p className="card-text small mb-2">
                Status:&nbsp;
                <span
                  className={`badge ${
                    isOnline ? 'bg-success' : 'bg-danger'
                  }`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </p>
            )}

            <div className="mt-auto d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => openDetails(device)}
              >
                Szczegóły
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailsModal = () => {
    if (!showDetails || !selectedDevice) return null;

    const src = selectedDevice.source;
    const base = selectedDevice;
    const extra = detailsData;

    const name =
      (src === 'ADDITIONAL' && extra && extra.name) || base.name || 'Bez nazwy';
    const category =
      (src === 'ADDITIONAL' && extra && extra.category) || base.category;
    const ratedPowerW =
      (src === 'ADDITIONAL' && extra && extra.ratedPowerW) || base.ratedPowerW;
    const description =
      (src === 'ADDITIONAL' && extra && extra.description) || base.description;

    const isOnline = src === 'TUYA' ? base.online === true : null;

    const model = src === 'TUYA' ? base.model : null;
    const ip = src === 'TUYA' ? base.ip : null;
    const lastUpdate = src === 'TUYA' ? base.lastUpdate : null;

    const createdAt =
      src === 'ADDITIONAL' && extra && extra.createdAt ? extra.createdAt : null;
    const updatedAt =
      src === 'ADDITIONAL' && extra && extra.updatedAt ? extra.updatedAt : null;

    return (
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      >
        <div className="card shadow-lg" style={{ maxWidth: '520px', width: '100%' }}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Szczegóły urządzenia</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={closeDetails}
            />
          </div>
          <div className="card-body">
            {detailsLoading && src === 'ADDITIONAL' && (
              <div className="d-flex align-items-center mb-3">
                <div className="spinner-border spinner-border-sm text-primary me-2" />
                <span className="small text-muted">Wczytywanie szczegółów...</span>
              </div>
            )}

            {detailsError && (
              <div className="alert alert-warning py-2 small">
                {detailsError}
              </div>
            )}

            <p className="mb-1">
              <span className="text-muted">Nazwa:&nbsp;</span>
              <strong>{name}</strong>
            </p>

            <p className="mb-1">
              <span className="text-muted">Źródło:&nbsp;</span>
              <strong>
                {src === 'TUYA' ? 'Tuya' : 'Urządzenie dodane ręcznie'}
              </strong>
            </p>

            <p className="mb-1">
              <span className="text-muted">Kategoria:&nbsp;</span>
              <strong>{category || 'brak'}</strong>
            </p>

            {ratedPowerW != null && (
              <p className="mb-1">
                <span className="text-muted">Moc znamionowa:&nbsp;</span>
                <strong>{ratedPowerW} W</strong>
              </p>
            )}

            {src === 'TUYA' && (
              <p className="mb-1">
                <span className="text-muted">Status:&nbsp;</span>
                <span
                  className={`badge ${
                    isOnline ? 'bg-success' : 'bg-danger'
                  }`}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </p>
            )}

            {src === 'TUYA' && model && (
              <p className="mb-1">
                <span className="text-muted">Model:&nbsp;</span>
                <strong>{model}</strong>
              </p>
            )}

            {src === 'TUYA' && ip && (
              <p className="mb-1">
                <span className="text-muted">IP:&nbsp;</span>
                <strong>{ip}</strong>
              </p>
            )}

            {src === 'TUYA' && lastUpdate && (
              <p className="mb-1">
                <span className="text-muted">Ostatnia aktualizacja:&nbsp;</span>
                <span>{new Date(lastUpdate).toLocaleString()}</span>
              </p>
            )}

            {src === 'ADDITIONAL' && createdAt && (
              <p className="mb-1">
                <span className="text-muted">Utworzono:&nbsp;</span>
                <span>{new Date(createdAt).toLocaleString()}</span>
              </p>
            )}

            {src === 'ADDITIONAL' && updatedAt && (
              <p className="mb-1">
                <span className="text-muted">Ostatnia zmiana:&nbsp;</span>
                <span>{new Date(updatedAt).toLocaleString()}</span>
              </p>
            )}

            {description && (
              <p className="mt-2">
                <span className="text-muted">Opis:&nbsp;</span>
                {description}
              </p>
            )}
          </div>
          <div className="card-footer d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeDetails}
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-light min-vh-100">
      <div className="container-fluid pb-5 pt-3">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-1">Dashboard urządzeń</h2>
            <p className="text-muted mb-0">
              Podgląd urządzeń Tuya oraz urządzeń dodanych ręcznie.
            </p>
          </div>
        </div>

        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Urządzenia Tuya</h4>
            <span className="badge bg-primary">
              {tuyaDevices.length} urządzeń
            </span>
          </div>

          {tuyaDevices.length === 0 ? (
            <div className="alert alert-info">
              Brak zsynchronizowanych urządzeń Tuya.
            </div>
          ) : (
            <div className="row">{tuyaDevices.map(renderDeviceCard)}</div>
          )}
        </section>

        <section>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Urządzenia dodatkowe</h4>
            <span className="badge bg-secondary">
              {additionalDevices.length} urządzeń
            </span>
          </div>

          {additionalDevices.length === 0 ? (
            <div className="alert alert-info">
              Nie dodano jeszcze żadnych urządzeń ręcznych.
            </div>
          ) : (
            <div className="row">{additionalDevices.map(renderDeviceCard)}</div>
          )}
        </section>
      </div>

      {renderDetailsModal()}
    </div>
  );
}

export default DeviceDashboard;
