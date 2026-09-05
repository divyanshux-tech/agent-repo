import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-stone-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand */}
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-[#FF6B4A]" viewBox="0 0 32 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12C0 5.37258 5.37258 0 12 0H20C26.6274 0 32 5.37258 32 12C32 18.6274 26.6274 24 20 24H12C5.37258 24 0 18.6274 0 12Z" />
            </svg>
            <span className="font-sans font-semibold text-[18px] text-stone-900 tracking-tight">NuraTravel</span>
          </Link>
          <p className="text-stone-500 text-[14px] leading-relaxed max-w-sm">
            Your voice-first AI travel companion for India. Search flights, trains, and hotels in Hindi, English, and Hinglish.
          </p>
        </div>

        {/* Links Column 1 */}
        <div>
          <h4 className="font-sans font-semibold text-[15px] text-stone-900 mb-4">About</h4>
          <ul className="flex flex-col gap-3">
            <li><Link to="#" className="text-stone-500 hover:text-primary-500 text-[14px] transition-colors">How it works</Link></li>
            <li><Link to="#" className="text-stone-500 hover:text-primary-500 text-[14px] transition-colors">Destinations</Link></li>
            <li><Link to="#" className="text-stone-500 hover:text-primary-500 text-[14px] transition-colors">Pricing</Link></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div>
          <h4 className="font-sans font-semibold text-[15px] text-stone-900 mb-4">Legal</h4>
          <ul className="flex flex-col gap-3">
            <li><Link to="#" className="text-stone-500 hover:text-primary-500 text-[14px] transition-colors">Terms of Service</Link></li>
            <li><Link to="#" className="text-stone-500 hover:text-primary-500 text-[14px] transition-colors">Privacy Policy</Link></li>
            <li><Link to="#" className="text-stone-500 hover:text-primary-500 text-[14px] transition-colors">Contact Us</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pt-8 border-t border-stone-200">
        <p className="text-stone-400 text-[13px]">
          © {new Date().getFullYear()} NuraTravel. All rights reserved. Built for academic demonstration.
        </p>
      </div>
    </footer>
  );
};