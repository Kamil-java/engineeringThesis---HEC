import React, { useState } from 'react';
import DeviceDashboard from './components/DeviceDashboard';
import ManageAdditionalDevices from './components/ManageAdditionalDevices';
import CostCalculator from './components/CostCalculator';
import EnergyHistory from './components/EnergyHistory';
import TariffSettings from './components/TariffSettings';
import EnergyAdvisor from './components/EnergyAdvisor';


function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNavClick = (view) => {
    setActiveView(view);
    setMobileNavOpen(false);
  };

  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid">
          <button
            type="button"
            className="btn btn-outline-light border-0 d-lg-none me-2"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <span className="navbar-brand mb-0 h1">
            Home Energy Controller
          </span>

          <ul className="navbar-nav ms-auto mb-0 d-none d-lg-flex flex-row">
            <li className="nav-item me-3">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'dashboard' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('dashboard')}
              >
                Dashboard
              </button>
            </li>
            <li className="nav-item me-3">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'manageAdditional'
                    ? 'fw-bold text-white'
                    : 'text-light')
                }
                onClick={() => handleNavClick('manageAdditional')}
              >
                Zarządzaj dodanymi urządzeniami
              </button>
            </li>
            <li className="nav-item me-3">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'estimation' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('estimation')}
              >
                Estymacja kosztów
              </button>
            </li>
            <li className="nav-item me-3">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'history' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('history')}
              >
                Historia kosztów
              </button>
            </li>
            <li className="nav-item me-3">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'tariff' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('tariff')}
              >
                Ustawienia taryfy
              </button>
            </li>
            <li className="nav-item me-3">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'advisor' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('advisor')}
              >
                Asystent energii
              </button>
            </li>
          </ul>
        </div>
      </nav>
      
      {mobileNavOpen && (
        <div className="bg-dark d-lg-none">
          <div className="container-fluid py-2">
            <button
              type="button"
              className={
                'btn w-100 text-start text-light mb-2 ' +
                (activeView === 'dashboard' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={
                'btn w-100 text-start text-light mb-2 ' +
                (activeView === 'manageAdditional' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('manageAdditional')}
            >
              Zarządzaj dodanymi urządzeniami
            </button>
            <button
              type="button"
              className={
                'btn w-100 text-start text-light mb-2 ' +
                (activeView === 'estimation' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('estimation')}
            >
              Estymacja kosztów
            </button>
            <button
              type="button"
              className={
                'btn w-100 text-start text-light mb-2 ' +
                (activeView === 'history' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('history')}
            >
              Historia kosztów
            </button>
            <button
              type="button"
              className={
                'btn w-100 text-start text-light ' +
                (activeView === 'tariff' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('tariff')}
            >
              Ustawienia taryfy
            </button>
            <button
              type="button"
              className={
                'btn w-100 text-start text-light mb-2 ' +
                (activeView === 'advisor' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('advisor')}
            >
              Asystent energii
            </button>
          </div>
        </div>
      )}


      {activeView === 'dashboard' && <DeviceDashboard />}
      {activeView === 'manageAdditional' && <ManageAdditionalDevices />}
      {activeView === 'estimation' && <CostCalculator />}
      {activeView === 'history' && <EnergyHistory />}
      {activeView === 'tariff' && <TariffSettings />}
      {activeView === 'advisor' && <EnergyAdvisor />}
    </div>
  );
}

export default App;
