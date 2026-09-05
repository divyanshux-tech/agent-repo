import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { NuraAgentDashboard } from './components/agent/NuraAgentDashboard';

// Layout with Navbar and Footer
const StandardLayout = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow flex flex-col">
      <Outlet />
    </main>
    <Footer />
  </div>
);

// Placeholder Pages for now
const ResultsPage = () => <div className="min-h-screen pt-16 flex items-center justify-center font-display text-4xl">ResultsPage</div>;
const ItineraryPage = () => <div className="min-h-screen pt-16 flex items-center justify-center font-display text-4xl">ItineraryPage</div>;
const BookingPage = () => <div className="min-h-screen pt-16 flex items-center justify-center font-display text-4xl">BookingPage</div>;
const TripPage = () => <div className="min-h-screen pt-16 flex items-center justify-center font-display text-4xl">TripPage</div>;
const ProfilePage = () => <div className="min-h-screen pt-16 flex items-center justify-center font-display text-4xl">ProfilePage</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen app routes */}
        <Route path="/demo" element={<NuraAgentDashboard />} />
        
        {/* Standard website routes */}
        <Route element={<StandardLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/results/:tripId" element={<ResultsPage />} />
          <Route path="/itinerary/:tripId" element={<ItineraryPage />} />
          <Route path="/booking/:planId" element={<BookingPage />} />
          <Route path="/trip/:tripId" element={<TripPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;