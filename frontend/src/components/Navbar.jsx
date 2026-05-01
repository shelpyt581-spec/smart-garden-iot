import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import logo from '../assets/logo.png';

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const isActive = (path) => {
    const isCurrent = location.pathname === path;
    const base = "pb-1 transition-all uppercase text-[13px] tracking-widest font-black";
    
    if (isCurrent) {
      return `${base} border-b-2 border-smart-glow text-smart-glow`;
    }
    return `${base} text-white hover:text-smart-glow`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <nav className="bg-smart-dark text-white shadow-xl sticky top-0 z-50 h-24 transition-colors duration-300 border-b border-smart-light/20">
      <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center relative">
        {/* Logo */}
        <Link to="/" className="hover:opacity-90 transition transform absolute left-6 top-1/2 -translate-y-1/2 z-10">
          <img src={logo} alt="Smart Garden Logo" className="h-32 w-auto object-contain drop-shadow-xl" />
        </Link>

        {/* Spacer for Logo */}
        <div className="w-64"></div>

        {/* Nav Links */}
        <div className="flex items-center space-x-10 text-[15px] font-medium">
          <Link to="/" className={isActive('/')}>Home</Link>
          <Link to="/about" className={isActive('/about')}>About Us</Link>
          <Link to="/map" className={isActive('/map')}>Park Map</Link>
          <Link to="/book" className={isActive('/book')}>Book Tickets</Link>
          
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white border border-white/20 ml-2 shadow-sm"
            title="Toggle Light/Dark Mode"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-smart-glow" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd"></path></svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            )}
          </button>

          {token && role === 'user' && (
            <Link to="/profile" className={`flex items-center space-x-1 ${isActive('/profile')}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <span>Profile</span>
            </Link>
          )}

          {token && role === 'user' && (
            <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors ml-2 font-bold uppercase text-xs tracking-widest">
              Logout
            </button>
          )}

          {/* Secure Admin Button */}
          <Link
            to="/admin"
            className="flex items-center space-x-2 bg-white/10 border border-white/20 hover:bg-white/20 text-smart-glow px-5 py-2.5 rounded-xl font-black transition-all shadow-md transform hover:-translate-y-0.5 ml-4"
          >
            <svg className="w-4 h-4 text-smart-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            <span className="tracking-widest uppercase text-[12px]">Admin Panel</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
