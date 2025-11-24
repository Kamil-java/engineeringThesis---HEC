// src/components/TariffSettings.jsx
import React, { useEffect, useState } from 'react';
import { fetchTariffSettings, updateTariffSettings } from '../api/deviceApi';

function TariffSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const [settings, setSettings] = useState({
    netRatePerKwh: '',
    grossRatePerKwh: '',
    vatPercent: '',
    updatedAt: null,
  });

  const [formData, setFormData] = useState({
    netRatePerKwh: '',
    grossRatePerKwh: '',
    vatPercent: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTariffSettings();

        const net = data.netRatePerKwh ?? data.netRate ?? null;
        const gross = data.grossRatePerKwh ?? data.grossRate ?? null;
        const vat = data.vatPercent ?? data.vat ?? null;

        setSettings({
          netRatePerKwh: net,
          grossRatePerKwh: gross,
          vatPercent: vat,
          updatedAt: data.updatedAt ?? null,
        });

        setFormData({
          netRatePerKwh: net != null ? String(net) : '',
          grossRatePerKwh: gross != null ? String(gross) : '',
          vatPercent: vat != null ? String(vat) : '',
        });
      } catch (e) {
        console.error(e);
        setError('Nie udało się pobrać aktualnych ustawień taryfy.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const net = formData.netRatePerKwh.trim();
    const gross = formData.grossRatePerKwh.trim();
    const vat = formData.vatPercent.trim();

    if (!gross && !net) {
      alert('Podaj przynajmniej jedną stawkę (netto lub brutto).');
      return;
    }

    const dto = {};

    if (net) {
      const val = parseFloat(net.replace(',', '.'));
      if (isNaN(val) || val <= 0) {
        alert('Stawka netto musi być dodatnią liczbą.');
        return;
      }
      dto.netRatePerKwh = val;
    }

    if (gross) {
      const val = parseFloat(gross.replace(',', '.'));
      if (isNaN(val) || val <= 0) {
        alert('Stawka brutto musi być dodatnią liczbą.');
        return;
      }
      dto.grossRatePerKwh = val;
    }

    if (vat) {
      const val = parseFloat(vat.replace(',', '.'));
      if (isNaN(val) || val < 0 || val > 100) {
        alert('VAT musi być liczbą z zakresu 0–100.');
        return;
      }
      dto.vatPercent = val;
    }

    try {
      setSaving(true);
      setError(null);
      setInfoMessage(null);

      const updated = await updateTariffSettings(dto);

      const netNew = updated.netRatePerKwh ?? updated.netRate ?? null;
      const grossNew = updated.grossRatePerKwh ?? updated.grossRate ?? null;
      const vatNew = updated.vatPercent ?? updated.vat ?? null;

      setSettings({
        netRatePerKwh: netNew,
        grossRatePerKwh: grossNew,
        vatPercent: vatNew,
        updatedAt: updated.updatedAt ?? new Date().toISOString(),
      });

      setFormData({
        netRatePerKwh: netNew != null ? String(netNew) : '',
        grossRatePerKwh: grossNew != null ? String(grossNew) : '',
        vatPercent: vatNew != null ? String(vatNew) : '',
      });

      setInfoMessage('Zapisano nowe ustawienia taryfy.');
    } catch (e) {
      console.error(e);
      setError('Nie udało się zapisać ustawień taryfy.');
    } finally {
      setSaving(false);
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

  const { netRatePerKwh, grossRatePerKwh, vatPercent, updatedAt } = settings;

  return (
    <div className="bg-light min-vh-100">
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        {/* Nagłówek */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="mb-1">Ustawienia taryfy energii</h2>
            <p className="text-muted mb-0">
              Tutaj definiujesz globalne stawki za energię elektryczną. 
              Wszystkie obliczenia kosztów (historyczne i estymacje) będą korzystać z tych wartości.
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
          {/* Podsumowanie aktualnych stawek */}
          <div className="col-12 col-lg-5">
            <div className="card shadow-sm h-100 bg-gradient-primary text-white border-0">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-3">
                  Aktualne stawki (globalne)
                </h5>

                <div className="mb-3">
                  <div className="text-uppercase small opacity-75">
                    Stawka brutto
                  </div>
                  <div className="display-6 fw-semibold">
                    {grossRatePerKwh != null
                      ? grossRatePerKwh.toFixed(2)
                      : '—'}{' '}
                    <span className="fs-4">zł/kWh</span>
                  </div>
                </div>

                <div className="mb-3 d-flex flex-wrap gap-3">
                  <div>
                    <div className="text-uppercase small opacity-75">
                      Stawka netto
                    </div>
                    <div className="h4 mb-0">
                      {netRatePerKwh != null
                        ? netRatePerKwh.toFixed(2)
                        : '—'}{' '}
                      <span className="fs-6">zł/kWh</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-uppercase small opacity-75">
                      VAT
                    </div>
                    <div className="h4 mb-0">
                      {vatPercent != null
                        ? vatPercent.toFixed(1)
                        : '—'}{' '}
                      <span className="fs-6">%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto small opacity-75">
                  <div>
                    Ost. aktualizacja:{' '}
                    <strong>
                      {updatedAt
                        ? new Date(updatedAt).toLocaleString('pl-PL')
                        : 'brak danych'}
                    </strong>
                  </div>
                  <div>
                    Wpływa na: estymacje, historię kosztów, oświetlenie i inne
                    kalkulacje.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formularz edycji */}
          <div className="col-12 col-lg-7">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title mb-2">Edytuj taryfę</h5>
                <p className="text-muted small mb-3">
                  Możesz podać zarówno stawkę brutto, jak i netto oraz VAT. 
                  Backend może wyliczyć brakującą wartość (np. z brutto i VAT policzyć netto).
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Stawka brutto [zł/kWh]
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="grossRatePerKwh"
                        className="form-control"
                        value={formData.grossRatePerKwh}
                        onChange={handleChange}
                        placeholder="np. 1.20"
                      />
                      <small className="text-muted">
                        Z podatkiem (to, co realnie płacisz).
                      </small>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Stawka netto [zł/kWh]
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="netRatePerKwh"
                        className="form-control"
                        value={formData.netRatePerKwh}
                        onChange={handleChange}
                        placeholder="np. 0.98"
                      />
                      <small className="text-muted">
                        Bez podatku. Opcjonalne, jeśli podasz brutto i VAT.
                      </small>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">VAT [%]</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        name="vatPercent"
                        className="form-control"
                        value={formData.vatPercent}
                        onChange={handleChange}
                        placeholder="np. 23"
                      />
                      <small className="text-muted">
                        Aktualna stawka podatku VAT.
                      </small>
                    </div>
                  </div>

                  <div className="mt-4 d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={saving}
                      onClick={() => {
                        // reset do tego co jest w settings
                        setFormData({
                          netRatePerKwh:
                            netRatePerKwh != null ? String(netRatePerKwh) : '',
                          grossRatePerKwh:
                            grossRatePerKwh != null
                              ? String(grossRatePerKwh)
                              : '',
                          vatPercent:
                            vatPercent != null ? String(vatPercent) : '',
                        });
                        setInfoMessage(null);
                        setError(null);
                      }}
                    >
                      Przywróć aktualne wartości
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? 'Zapisywanie…' : 'Zapisz ustawienia taryfy'}
                    </button>
                  </div>
                </form>

                <hr className="my-4" />

                <p className="text-muted small mb-0">
                  <strong>Tip:</strong> Jeśli Twoja faktura podaje tylko cenę brutto 
                  za 1 kWh, wpisz ją w pole brutto, a VAT ustaw zgodnie z fakturą 
                  (np. 23%). 
                  Jeśli masz dokładniejsze dane (osobno netto/brutto) – wprowadź oba.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TariffSettings;
