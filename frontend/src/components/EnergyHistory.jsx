// src/components/EnergyHistory.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchAllDevices,
  fetchDeviceCurrentMonthCost,
  fetchDeviceTodayCost,
  fetchDeviceLastHourCost,
  fetchLightingCurrentMonth,
} from '../api/deviceApi';

function EnergyHistory() {
  const [devices, setDevices] = useState([]); // tylko TUYA
  const [deviceStats, setDeviceStats] = useState([]); // { deviceId, name, category, energyKwh, cost, avgPowerW }

  const [viewMode, setViewMode] = useState('MONTH'); // 'MONTH' | 'DAY' | 'HOUR'
  const [periodLabel, setPeriodLabel] = useState('');

  const [totalCost, setTotalCost] = useState(0);
  const [perCategory, setPerCategory] = useState({});

  const [lightingStats, setLightingStats] = useState([]); // [{ deviceId, name, ratedPowerW, energyKwh, cost }]

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const viewModeLabel =
    viewMode === 'MONTH'
      ? 'Miesięcznie'
      : viewMode === 'DAY'
      ? 'Dziennie (dzisiaj)'
      : 'Godzinowo (ostatnia godzina)';

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Pobierz wszystkie urządzenia i filtruj tylko TUYA
        const all = await fetchAllDevices();
        const tuyaDevices = all.filter((d) => d.source === 'TUYA');
        setDevices(tuyaDevices);

        // 2. Ustal label okresu
        const now = new Date();
        if (viewMode === 'MONTH') {
          setPeriodLabel(
            `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
          );
        } else if (viewMode === 'DAY') {
          setPeriodLabel(
            now.toLocaleDateString('pl-PL', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          );
        } else {
          setPeriodLabel('Ostatnia godzina');
        }

        // 3. Pobierz koszty dla każdego urządzenia (podstawowe)
        const perDevicePromises = tuyaDevices.map(async (d) => {
          try {
            let data;
            if (viewMode === 'MONTH') {
              data = await fetchDeviceCurrentMonthCost(d.id);
            } else if (viewMode === 'DAY') {
              data = await fetchDeviceTodayCost(d.id);
            } else {
              data = await fetchDeviceLastHourCost(d.id);
            }

            return {
              deviceId: d.id,
              name: d.name || 'Bez nazwy',
              category: d.category || '-',
              energyKwh: Number(data.energyKwh ?? data.energy ?? 0),
              cost: Number(data.cost ?? 0),
              avgPowerW: Number(data.avgPowerW ?? 0),
            };
          } catch (e) {
            console.error(
              'Błąd pobierania danych historycznych dla urządzenia id=' + d.id,
              e
            );
            return null;
          }
        });

        let baseStats = (await Promise.all(perDevicePromises)).filter(
          (x) => x !== null
        );

        let finalStats = baseStats;
        let lighting = [];

        // 4. Dla widoku "MIESIĄC" – scal z danymi oświetlenia
        if (viewMode === 'MONTH') {
          const lightingDevices = tuyaDevices.filter(
            (d) => d.category === 'dj'
          );

          const lightingPromises = lightingDevices.map(async (d) => {
            try {
              const resp = await fetchLightingCurrentMonth(d.id);
              return {
                deviceId: d.id,
                name: d.name || 'Bez nazwy',
                ratedPowerW: d.ratedPowerW ?? null,
                energyKwh: Number(resp.energyKwh ?? 0),
                cost: Number(resp.cost ?? 0),
              };
            } catch (e) {
              console.error(
                'Błąd pobierania danych oświetlenia dla urządzenia id=' + d.id,
                e
              );
              return null;
            }
          });

          lighting = (await Promise.all(lightingPromises)).filter(
            (x) => x !== null
          );
          setLightingStats(lighting);

          // mapa: deviceId -> lighting entry
          const lightingById = {};
          lighting.forEach((l) => {
            lightingById[l.deviceId] = l;
          });

          // nadpisz statystyki dla urządzeń 'dj' danymi z lighting
          finalStats = baseStats.map((s) => {
            const l = lightingById[s.deviceId];
            if (l) {
              return {
                ...s,
                energyKwh: l.energyKwh,
                cost: l.cost,
              };
            }
            return s;
          });

          // jeśli z jakiegoś powodu w baseStats nie ma lampy,
          // a jest w lighting – dodaj jako nowy wpis
          lighting.forEach((l) => {
            const exists = finalStats.some((s) => s.deviceId === l.deviceId);
            if (!exists) {
              const dev = tuyaDevices.find((d) => d.id === l.deviceId);
              finalStats.push({
                deviceId: l.deviceId,
                name: l.name,
                category: dev?.category || 'dj',
                energyKwh: l.energyKwh,
                cost: l.cost,
                avgPowerW: 0,
              });
            }
          });
        } else {
          // dla DAY/HOUR nie używamy lightingowego endpointu
          setLightingStats([]);
        }

        // 5. Agregacja: suma i koszt per kategoria na podstawie finalStats
        let total = 0;
        const perCat = {};
        for (const s of finalStats) {
          total += s.cost;
          const cat = s.category || '-';
          perCat[cat] = (perCat[cat] || 0) + s.cost;
        }

        setDeviceStats(finalStats);
        setTotalCost(total);
        setPerCategory(perCat);
      } catch (e) {
        console.error(e);
        setError('Nie udało się pobrać danych historycznych.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [viewMode]);

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

  const categories = Object.keys(perCategory);
  const categoryValues = categories.map((k) => Number(perCategory[k] || 0));
  const maxCategoryCost =
    categoryValues.length > 0 ? Math.max(...categoryValues) : 0;

  const sortedDeviceCosts = [...deviceStats].sort(
    (a, b) => b.cost - a.cost
  );

  const lightingTotalCost = lightingStats.reduce(
    (sum, l) => sum + l.cost,
    0
  );

  const viewLabel =
    viewMode === 'MONTH'
      ? 'Miesięcznie'
      : viewMode === 'DAY'
      ? 'Dziennie (dzisiaj)'
      : 'Godzinowo (ostatnia godzina)';

  return (
    <div className="bg-light min-vh-100">
      <div className="pb-5 pt-3 px-3 px-md-4 px-lg-5">
        {/* Nagłówek */}
        <div className="row mb-4 align-items-center">
          <div className="col-12 col-md-7">
            <h2 className="mb-1">Historia kosztów energii</h2>
            <p className="text-muted mb-0">
              Widok: <strong>{viewLabel}</strong> – okres:{' '}
              <strong>{periodLabel}</strong>. Dane tylko dla urządzeń Tuya.
            </p>
          </div>
          <div className="col-12 col-md-5 mt-3 mt-md-0 d-flex justify-content-md-end">
            <div
              className="btn-group shadow-sm"
              role="group"
              aria-label="Tryb widoku"
            >
              <button
                type="button"
                className={
                  'btn btn-sm ' +
                  (viewMode === 'MONTH' ? 'btn-primary' : 'btn-outline-primary')
                }
                onClick={() => setViewMode('MONTH')}
              >
                Miesiąc
              </button>
              <button
                type="button"
                className={
                  'btn btn-sm ' +
                  (viewMode === 'DAY' ? 'btn-primary' : 'btn-outline-primary')
                }
                onClick={() => setViewMode('DAY')}
              >
                Dzień
              </button>
              <button
                type="button"
                className={
                  'btn btn-sm ' +
                  (viewMode === 'HOUR' ? 'btn-primary' : 'btn-outline-primary')
                }
                onClick={() => setViewMode('HOUR')}
              >
                Godzina
              </button>
            </div>
          </div>
        </div>

        {/* Karty podsumowania */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100 bg-gradient-primary text-white border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="text-uppercase fw-semibold small mb-0">
                    Całkowity koszt (okres)
                  </h6>
                  <span className="badge bg-light text-dark">
                    {devices.length} urządzeń
                  </span>
                </div>
                <h2 className="mb-1">
                  {totalCost.toFixed(2)} <small className="fs-5">zł</small>
                </h2>
                <p className="small mb-0 opacity-75">
                  Suma kosztów wszystkich urządzeń Tuya w wybranym przedziale
                  czasu (w tym oświetlenia przy widoku miesięcznym).
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-2">
                  Średni koszt na urządzenie
                </h6>
                <h3 className="mb-1">
                  {devices.length > 0
                    ? (totalCost / devices.length).toFixed(2)
                    : '0.00'}{' '}
                  <small className="fs-6 text-muted">zł / urządzenie</small>
                </h3>
                <p className="small text-muted mb-0">
                  Prosta średnia – pomaga szybko ocenić, czy jakieś urządzenie
                  mocno odstaje od reszty.
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-2">
                  Liczba kategorii
                </h6>
                <h3 className="mb-1">{categories.length}</h3>
                <p className="small text-muted mb-0">
                  Kategorie są oparte na polu <code>category</code> w
                  urządzeniach Tuya (np. <code>cz</code> – gniazdka,{' '}
                  <code>dj</code> – oświetlenie).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Koszt per kategoria + top urządzenia */}
        <div className="row g-4 mb-4">
          {/* Koszt per kategoria */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="card-title mb-0">Koszt per kategoria (Tuya)</h5>
                  {categories.length > 0 && (
                    <span className="badge bg-dark-subtle text-dark">
                      {categories.length} kategorii
                    </span>
                  )}
                </div>
                {categories.length === 0 ? (
                  <p className="text-muted mb-0">
                    Brak danych per kategoria w wybranym okresie.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-3 mt-2">
                    {categories.map((cat) => {
                      const value = Number(perCategory[cat] || 0);
                      const percent =
                        maxCategoryCost > 0
                          ? Math.max(
                              5,
                              Math.round((value / maxCategoryCost) * 100)
                            )
                          : 0;
                      return (
                        <div key={cat}>
                          <div className="d-flex justify-content-between mb-1">
                            <span className="fw-semibold">{cat}</span>
                            <span className="text-muted">
                              {value.toFixed(2)} zł
                            </span>
                          </div>
                          <div className="progress" style={{ height: '0.8rem' }}>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{ width: `${percent}%` }}
                              aria-valuenow={percent}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top urządzenia */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-3">
                  Top urządzenia Tuya wg kosztu (okres)
                </h5>
                {sortedDeviceCosts.length === 0 ? (
                  <p className="text-muted mb-0">
                    Brak danych kosztów per urządzenie.
                  </p>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Urządzenie</th>
                            <th>Kategoria</th>
                            <th className="text-end">Koszt [zł]</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDeviceCosts.slice(0, 7).map((d, idx) => (
                            <tr
                              key={d.deviceId}
                              className={
                                idx === 0 ? 'table-warning' : undefined
                              }
                            >
                              <td>{idx + 1}</td>
                              <td>{d.name}</td>
                              <td>{d.category}</td>
                              <td className="text-end">
                                {d.cost.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sortedDeviceCosts.length > 7 && (
                      <p className="text-muted small mt-2 mb-0">
                        Wyświetlono 7 z {sortedDeviceCosts.length} urządzeń.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Oświetlenie – tylko dla widoku miesięcznego */}
        {viewMode === 'MONTH' && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">
                      Oświetlenie – bieżący miesiąc
                    </h5>
                    <span className="badge bg-warning-subtle text-dark">
                      Łączny koszt: {lightingTotalCost.toFixed(2)} zł
                    </span>
                  </div>
                  {lightingStats.length === 0 ? (
                    <p className="text-muted mb-0">
                      Brak danych oświetleniowych (kategoria <code>dj</code>).
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Urządzenie</th>
                            <th>Moc znamionowa [W]</th>
                            <th>Energia [kWh]</th>
                            <th>Koszt [zł]</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lightingStats.map((l) => (
                            <tr key={l.deviceId}>
                              <td>{l.name}</td>
                              <td>
                                {l.ratedPowerW != null
                                  ? l.ratedPowerW.toFixed(1)
                                  : '—'}
                              </td>
                              <td>{l.energyKwh.toFixed(3)}</td>
                              <td>{l.cost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-muted small mt-2 mb-0">
                    Dane oświetlenia są liczone na podstawie historii
                    włącz/wyłącz lamp (tabela <code>lighting_usage</code>),
                    specjalnym endpointem,
                    a ich koszt jest wliczany do podsumowania miesięcznego
                    powyżej.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Szczegółowa tabela urządzeń */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  Szczegóły zużycia i kosztów per urządzenie (Tuya)
                </h5>
                {sortedDeviceCosts.length === 0 ? (
                  <p className="text-muted mb-0">
                    Brak danych do wyświetlenia w wybranym okresie.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Urządzenie</th>
                          <th>Kategoria</th>
                          <th>Energia [kWh]</th>
                          <th>Śr. moc [W]</th>
                          <th>Koszt [zł]</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDeviceCosts.map((d) => (
                          <tr key={d.deviceId}>
                            <td>{d.name}</td>
                            <td>{d.category}</td>
                            <td>{d.energyKwh.toFixed(3)}</td>
                            <td>{d.avgPowerW.toFixed(1)}</td>
                            <td>{d.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-muted small mt-2 mb-0">
                  Dane pochodzą z logów poboru energii (tabela{' '}
                  <code>energy_measurements</code>) oraz – dla oświetlenia w
                  widoku miesięcznym – z <code>lighting_usage</code>, z
                  uwzględnieniem aktualnej taryfy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnergyHistory;
