import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import api from './lib/api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Mentees from './pages/Mentees';
import Materials from './pages/Materials';
import Assignments from './pages/Assignments';
import Chat from './pages/Chat';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      localStorage.removeItem('user');
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/me');
      if (res.data.authenticated) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!user ? <Login onLogin={checkAuth} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={checkAuth} /> : <Navigate to="/login" />} />
        <Route path="/mentees" element={user && user.role === 'guru' ? <Mentees user={user} onLogout={checkAuth} /> : <Navigate to="/dashboard" />} />
        <Route path="/materials" element={user ? <Materials user={user} onLogout={checkAuth} /> : <Navigate to="/login" />} />
        <Route path="/assignments" element={user ? <Assignments user={user} onLogout={checkAuth} /> : <Navigate to="/login" />} />
        <Route path="/chat" element={user ? <Chat user={user} onLogout={checkAuth} /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
