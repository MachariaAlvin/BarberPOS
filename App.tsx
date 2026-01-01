
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Appointments } from './pages/Appointments';
import { StaffPage } from './pages/Staff';
import { Inventory } from './pages/Inventory';
import { Customers } from './pages/Customers';
import { ServicesPage } from './pages/ServicesPage';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { SuperAdmin } from './pages/SuperAdmin';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { OnlineBooking } from './pages/OnlineBooking';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const SplashScreen: React.FC = () => (
  <div style={{ position: 'fixed', inset: 0, backgroundColor: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
    <div style={{ position: 'relative', marginBottom: '32px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: '#eab308', filter: 'blur(64px)', opacity: 0.1, borderRadius: '9999px' }}></div>
      <div style={{ position: 'relative', width: '192px', height: '192px', borderRadius: '9999px', overflow: 'hidden', border: '4px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <img 
          src="https://media.giphy.com/media/3o7TKr3nzbh5WgCFpe/giphy.gif" 
          alt="Barber Shop"
          // Fix: 'objectCover' does not exist in React.CSSProperties. Using 'objectFit' instead.
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to top, rgba(15, 23, 42, 0.5), transparent)' }}></div>
      </div>
    </div>

    <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
      <h1 style={{ fontSize: '48px', fontWeight: '900', color: 'white', letterSpacing: '0.2em', marginBottom: '8px', textShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        BARBER<span style={{ color: '#eab308' }}>PRO</span>
      </h1>
      <div style={{ height: '4px', width: '96px', backgroundImage: 'linear-gradient(to right, transparent, #ca8a04, transparent)', margin: '0 auto 24px auto', borderRadius: '9999px' }}></div>
      <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Initializing Workspace...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      console.log("🏁 BarberPro: SplashScreen dismissing...");
      setShowSplash(false);
    }, 2500);

    // Global error listener to help debug blank screens
    const handleError = (e: PromiseRejectionEvent | ErrorEvent) => {
      console.error("🔥 Global App Error:", e);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <DatabaseProvider>
      <AuthProvider>
        {showSplash && <SplashScreen />}
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/book" element={<OnlineBooking />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/super-admin" element={<SuperAdmin />} />
                    <Route path="/point-of-sale" element={<POS />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/staff" element={<StaffPage />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </DatabaseProvider>
  );
};

export default App;
