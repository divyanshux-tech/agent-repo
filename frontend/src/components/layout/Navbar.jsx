import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Destinations', path: '/destinations' },
    { name: 'Itineraries', path: '/itineraries' },
    { name: 'Flights', path: '/flights' },
    { name: 'Hotels', path: '/hotels' },
  ];

  return (
    <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-7xl flex items-center justify-between pointer-events-auto">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 relative z-10 group">
          <svg className="w-7 h-7 text-[#FF6B4A] group-hover:scale-110 transition-transform" viewBox="0 0 32 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" />
          </svg>
          <span className="font-sans font-medium text-[22px] tracking-tight text-nura-dark">NuraTravel</span>
        </Link>

        {/* Floating Nav Pill */}
        <div className="hidden md:flex items-center gap-2 glass-pill p-2 pl-8 border border-white/40 shadow-sm bg-white/40 backdrop-blur-2xl">
          <div className="flex items-center gap-8 mr-6">
            {navLinks.map(link => (
              <Link 
                key={link.name} 
                to={link.path}
                className="text-[15px] font-sans font-normal text-[#4A403F] hover:text-black transition-colors"
                style={{ WebkitFontSmoothing: 'antialiased' }}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <Button variant="primary" size="md" className="font-normal text-[15px] px-6">
            Plan trips for free
          </Button>
          
          <button className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-nura-orange text-white hover:bg-[#F02FC2] transition-colors ml-[-4px] shadow-glow">
            <ArrowRight size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Mobile Menu */}
        <button className="md:hidden glass-pill w-12 h-12 flex items-center justify-center text-nura-dark">
          <Menu size={24} />
        </button>

      </div>
    </nav>
  );
};