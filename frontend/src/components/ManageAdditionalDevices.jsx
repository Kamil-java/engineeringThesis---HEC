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
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    ratedPowerW: '',
    description: '',
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: '',
      ratedPowerW: '',
      description: '',
    });
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdditionalDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
      setError('Nie udało się pobrać listy dodatkowych urządzeń.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = (device) => {
    setEditingId(device.id);
    setFormData({
      name: device.name || '',
      category: device.category || '',
      ratedPowerW:
        device.ratedPowerW != null ? String(device.ratedPowerW) : '',
      description: device.description || '',
    });
    setInfoMessage(null);
    setError(null);
  };

  const handleCancel = () => {
    resetForm();
    setInfoMessage(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim() || null,
      ratedPowerW:
        formData.ratedPowerW.trim() !== ''
          ? parseFloat(formData.ratedPowerW)
          : null,
      description: formData.description.trim() || null,
    };

    if (!payload.name) {
      alert('Nazwa urządzenia jest wymagana.');
      return;
    }

    if (
      payload.ratedPowerW != null &&
      (isNaN(payload.ratedPowerW) || payload.ratedPowerW <= 0)
    ) {
      alert('Moc znamionowa musi być dodatnią liczbą.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setInfoMessage(null);

      if (editingId == null) {
        await createAdditionalDevice(payload);
        setInfoMessage('Dodano nowe urządzenie.');
      } else {
        await updateAdditionalDevice(editingId, payload);
        setInfoMessage('Zaktualizowano urządzenie.');
      }

      await loadDevices();
      resetForm();
    } catch (e) {
      console.error(e);
      setError('Nie udało się zapisać urządzenia.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const dev = devices.find((d) => d.id === id);
    const label = dev ? dev.name : `ID=${id}`;
    if (!window.confirm(`Czy na pewno chcesz usunąć urządzenie "${label}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);
      setInfoMessage(null);

      await deleteAdditionalDevice(id);
      setInfoMessage(`Usunięto urządzenie "${label}".`);
      await loadDevices();

      if (editingId === id) {
        resetForm();
      }
    } catch (e) {
      console.error(e);
      setError('Nie udało się usunąć urządzenia.');
    } finally {
      setDeletingId(null);
    }
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

  return (
    <div className="bg-light min-vh-100">
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="mb-1">Zarządzaj dodanymi urządzeniami</h2>
            <p className="text-muted mb-0">
              Tutaj konfigurujesz urządzenia, które nie są bezpośrednio z Tuya –
              np. monitor, komputer, lampka bez smart-gniazdka. 
              Te urządzenia są potem dostępne w sekcji estymacji kosztów.
            </p>
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

        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">
                    Dodane urządzenia ({devices.length})
                  </h5>
                </div>

                {devices.length === 0 ? (
                  <p className="text-muted mb-0">
                    Nie dodałeś jeszcze żadnych urządzeń. Użyj formularza po prawej,
                    aby dodać pierwsze urządzenie.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle table-striped mb-0">
                      <thead>
                        <tr>
                          <th>Nazwa</th>
                          <th>Kategoria</th>
                          <th>Moc [W]</th>
                          <th>Opis</th>
                          <th style={{ width: '130px' }} className="text-end">
                            Akcje
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {devices.map((d) => (
                          <tr key={d.id}>
                            <td className="fw-semibold">{d.name}</td>
                            <td>
                              {d.category ? (
                                <span className="badge bg-secondary-subtle text-dark">
                                  {d.category}
                                </span>
                              ) : (
                                <span className="text-muted small">brak</span>
                              )}
                            </td>
                            <td>
                              {d.ratedPowerW != null ? (
                                <span>{d.ratedPowerW.toFixed(1)}</span>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                            <td>
                              {d.description ? (
                                <span className="small text-muted">
                                  {d.description}
                                </span>
                              ) : (
                                <span className="text-muted small">
                                  brak opisu
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  onClick={() => handleEdit(d)}
                                  disabled={deletingId === d.id}
                                >
                                  Edytuj
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger ms-1"
                                  onClick={() => handleDelete(d.id)}
                                  disabled={deletingId === d.id}
                                >
                                  {deletingId === d.id ? 'Usuwanie…' : 'Usuń'}
                                </button>
                              </div>
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

          <div className="col-12 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title mb-1">
                  {editingId == null ? 'Dodaj nowe urządzenie' : 'Edytuj urządzenie'}
                </h5>
                <p className="text-muted small mb-3">
                  Uzupełnij podstawowe informacje – nazwa, kategoria i moc
                  znamionowa są kluczowe do poprawnej estymacji kosztów.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">
                      Nazwa urządzenia <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="np. Monitor 27''"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Kategoria</label>
                    <input
                      type="text"
                      className="form-control"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="np. RTV, AGD, Oświetlenie"
                    />
                    <small className="text-muted">
                      Dowolny tekst, pomoże pogrupować urządzenia.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Moc znamionowa [W]</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control"
                      name="ratedPowerW"
                      value={formData.ratedPowerW}
                      onChange={handleInputChange}
                      placeholder="np. 35"
                    />
                    <small className="text-muted">
                      Jeśli znasz moc z tabliczki znamionowej – wpisz ją tutaj.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Opis</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="np. Monitor biurkowy używany do pracy."
                    />
                  </div>

                  <div className="d-flex justify-content-between mt-3">
                    {editingId != null ? (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Anuluj edycję
                      </button>
                    ) : (
                      <span />
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? 'Zapisywanie…'
                        : editingId == null
                        ? 'Dodaj urządzenie'
                        : 'Zapisz zmiany'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageAdditionalDevices;
