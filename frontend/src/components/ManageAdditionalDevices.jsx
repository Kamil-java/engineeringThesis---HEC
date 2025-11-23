import React, { useEffect, useState } from 'react';
import {
  fetchAdditionalDevices,
  createAdditionalDevice,
  updateAdditionalDevice,
  deleteAdditionalDevice,
} from '../api/deviceApi';

function ManageAdditionalDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    id: null,
    name: '',
    category: '',
    ratedPowerW: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdditionalDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
      setError('Nie udało się pobrać urządzeń dodatkowych.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'ratedPowerW' ? value.replace(',', '.') : value,
    }));
  }

  function resetForm() {
    setForm({
      id: null,
      name: '',
      category: '',
      ratedPowerW: '',
      description: '',
    });
  }

  function startEdit(device) {
    setForm({
      id: device.id,
      name: device.name || '',
      category: device.category || '',
      ratedPowerW:
        device.ratedPowerW !== null && device.ratedPowerW !== undefined
          ? String(device.ratedPowerW)
          : '',
      description: device.description || '',
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('Nazwa jest wymagana');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      ratedPowerW: form.ratedPowerW
        ? parseFloat(form.ratedPowerW)
        : null,
      description: form.description.trim() || null,
    };

    try {
      setSaving(true);

      if (form.id == null) {
        await createAdditionalDevice(payload);
      } else {
        await updateAdditionalDevice(form.id, payload);
      }

      await loadDevices();
      resetForm();
    } catch (e) {
      console.error(e);
      alert('Wystąpił błąd podczas zapisu urządzenia.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Na pewno usunąć to urządzenie?')) {
      return;
    }

    try {
      await deleteAdditionalDevice(id);
      await loadDevices();
      if (form.id === id) {
        resetForm();
      }
    } catch (e) {
      console.error(e);
      alert('Nie udało się usunąć urządzenia.');
    }
  }

  return (
    <div className="bg-light min-vh-100">
      {/* brak container – pełna szerokość ekranu; tylko padding */}
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="mb-1">Zarządzaj dodanymi urządzeniami</h2>
            <p className="text-muted mb-0">
              Dodawaj, edytuj i usuwaj urządzenia ręcznie dodane do systemu.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Wczytywanie...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <div className="row g-4">
            {/* LISTA – na mobile cała szerokość, na >=lg 7/12 */}
            <div className="col-12 col-lg-7">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Twoje urządzenia</h5>
                  <span className="badge bg-secondary">
                    {devices.length} urządzeń
                  </span>
                </div>
                <div className="card-body p-0">
                  {devices.length === 0 ? (
                    <div className="p-3 text-muted">
                      Nie dodałeś jeszcze żadnych urządzeń.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nazwa</th>
                            <th>Kategoria</th>
                            <th>Moc [W]</th>
                            <th>Opis</th>
                            <th className="text-end">Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devices.map((dev) => (
                            <tr key={dev.id}>
                              <td>{dev.name}</td>
                              <td>{dev.category || '-'}</td>
                              <td>
                                {dev.ratedPowerW != null
                                  ? dev.ratedPowerW
                                  : '-'}
                              </td>
                              <td
                                className="text-truncate"
                                style={{ maxWidth: '260px' }}
                              >
                                {dev.description || '-'}
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary me-4"  // <- większy odstęp
                                  onClick={() => startEdit(dev)}
                                >
                                    Edytuj
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(dev.id)}
                                >
                                  Usuń
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FORMULARZ – na mobile cała szerokość, na >=lg 5/12 */}
            <div className="col-12 col-lg-5">
              <div className="card shadow-sm h-100">
                <div className="card-header">
                  <h5 className="mb-0">
                    {form.id == null
                      ? 'Dodaj nowe urządzenie'
                      : 'Edytuj urządzenie'}
                  </h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Nazwa *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Kategoria</label>
                      <input
                        type="text"
                        className="form-control"
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        placeholder="np. light, monitor, pc"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Moc znamionowa [W]</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        name="ratedPowerW"
                        value={form.ratedPowerW}
                        onChange={handleChange}
                        placeholder="np. 35"
                      />
                      <div className="form-text">
                        Używane do wyliczania zużycia energii.
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Opis</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="np. Lampa biurkowa w salonie"
                      />
                    </div>

                    <div className="d-flex justify-content-between">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetForm}
                        disabled={saving}
                      >
                        Wyczyść
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving
                          ? 'Zapisywanie...'
                          : form.id == null
                          ? 'Dodaj'
                          : 'Zapisz zmiany'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageAdditionalDevices;
