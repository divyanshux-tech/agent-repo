import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NuraAgentDashboard } from './components/agent/NuraAgentDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen agent route as default */}
        <Route path="/" element={<NuraAgentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;