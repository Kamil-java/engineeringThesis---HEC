import React, { useEffect, useState } from 'react';
import { fetchAdvisorMonthly } from '../api/deviceApi';

function EnergyAdvisor() {
  const [advices, setAdvices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdvisorMonthly();
        setAdvices(data || []);
      } catch (e) {
        console.error(e);
        setError('Nie udało się pobrać sugestii optymalizacji.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const globalAdvices = advices.filter((a) => a.type === 'GLOBAL');
  const deviceAdvices = advices.filter((a) => a.type === 'DEVICE');
  const categoryAdvices = advices.filter((a) => a.type === 'CATEGORY');

  const badgeClassForSeverity = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-danger';
      case 'WARNING':
        return 'bg-warning text-dark';
      default:
        return 'bg-info text-dark';
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
            <h2 className="mb-1">Asystent optymalizacji energii</h2>
            <p className="text-muted mb-0">
              Na podstawie Twoich danych (koszty, kategorie, taryfa) asystent
              podpowiada, gdzie najłatwiej szukać oszczędności.
            </p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title mb-3">Obraz całości</h5>
                {globalAdvices.length === 0 ? (
                  <p className="text-muted mb-0">
                    Brak szczególnych obserwacji na poziomie całego domu.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {globalAdvices.map((a, idx) => (
                      <div key={idx} className="border rounded-3 p-3 bg-light-subtle">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold">{a.title}</span>
                          <span
                            className={
                              'badge ' + badgeClassForSeverity(a.severity)
                            }
                          >
                            {a.severity}
                          </span>
                        </div>
                        <p className="mb-0 small text-muted">{a.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-3">Urządzenia z największym potencjałem oszczędności</h5>
                {deviceAdvices.length === 0 && categoryAdvices.length === 0 ? (
                  <p className="text-muted mb-0">
                    Na podstawie bieżących danych nie widać urządzeń, które mocno
                    odstają kosztami. To bardzo dobrze!
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {deviceAdvices.map((a) => (
                      <div key={a.deviceId} className="border rounded-3 p-3">
                        <div className="d-flex justify-content-between mb-1">
                          <div>
                            <div className="fw-semibold">
                              {a.deviceName || `Urządzenie ID ${a.deviceId}`}
                            </div>
                            {a.category && (
                              <small className="text-muted">
                                Kategoria: {a.category}
                              </small>
                            )}
                          </div>
                          <span
                            className={
                              'badge ' + badgeClassForSeverity(a.severity)
                            }
                          >
                            {a.severity}
                          </span>
                        </div>
                        <p className="mb-0 small text-muted">{a.message}</p>
                      </div>
                    ))}

                    {categoryAdvices.map((a, idx) => (
                      <div key={`cat-${idx}`} className="border rounded-3 p-3 bg-light-subtle">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-semibold">{a.title}</span>
                          <span
                            className={
                              'badge ' + badgeClassForSeverity(a.severity)
                            }
                          >
                            {a.severity}
                          </span>
                        </div>
                        <p className="mb-0 small text-muted">{a.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title mb-2">Jak działa asystent?</h5>
                <ul className="small text-muted mb-2">
                  <li>
                    analizuje miesięczne koszty per urządzenie (Tuya),
                  </li>
                  <li>
                    patrzy na udział kategorii (gniazdka, oświetlenie itp.),
                  </li>
                  <li>
                    oznacza urządzenia, które przekraczają ustalone progi kosztu.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnergyAdvisor;
