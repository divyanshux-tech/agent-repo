import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { NuraAgentDashboard } from './components/agent/NuraAgentDashboard';
import { SmartAuthProvider } from './components/auth/AuthProvider';

function App() {
  return (
    <SmartAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<NuraAgentDashboard />} />
        </Routes>
      </BrowserRouter>
    </SmartAuthProvider>
  );
}

export default App;