import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';

/**
 * Hauptkomponente der Anwendung mit Authentifizierungs-Routing
 * @returns {JSX.Element} App-Komponente mit geschützten Routen
 */
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen bg-hka-light-gray">
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <Home onLogout={() => setIsAuthenticated(false)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

export default App;
