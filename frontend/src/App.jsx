import React, { useState } from 'react';
import DeviceDashboard from './components/DeviceDashboard';
import ManageAdditionalDevices from './components/ManageAdditionalDevices';
import CostCalculator from './components/CostCalculator';

function App() {
  // 'dashboard' | 'manageAdditional' | 'costs'
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNavClick = (view) => {
    setActiveView(view);
    setMobileNavOpen(false); // schowaj menu po kliknięciu
  };

  return (
    <div className="bg-light min-vh-100">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid">
          {/* Hamburger - tylko na małych ekranach */}
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

          {/* Menu na dużych ekranach */}
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
                  (activeView === 'manageAdditional' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('manageAdditional')}
              >
                Zarządzaj dodanymi urządzeniami
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={
                  'nav-link btn btn-link px-0 text-decoration-none ' +
                  (activeView === 'costs' ? 'fw-bold text-white' : 'text-light')
                }
                onClick={() => handleNavClick('costs')}
              >
                Wyliczanie kosztów
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Menu rozwijane na małych ekranach */}
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
                'btn w-100 text-start text-light ' +
                (activeView === 'costs' ? 'fw-bold' : '')
              }
              onClick={() => handleNavClick('costs')}
            >
              Wyliczanie kosztów
            </button>
          </div>
        </div>
      )}

      {/* Główna zawartość */}
      {activeView === 'dashboard' && <DeviceDashboard />}
      {activeView === 'manageAdditional' && <ManageAdditionalDevices />}
      {activeView === 'costs' && <CostCalculator />}
    </div>
  );
}

export default App;
