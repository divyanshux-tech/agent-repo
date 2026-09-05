import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NuraAgentDashboard } from './components/agent/NuraAgentDashboard';
import { SmartAuthProvider } from './components/auth/AuthProvider';

function App() {
  return (
    <SmartAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Full-screen agent route as default */}
          <Route path="/" element={<NuraAgentDashboard />} />
        </Routes>
      </BrowserRouter>
    </SmartAuthProvider>
  );
}

export default App;