import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        data = { error: `HTTP Error ${response.status}: ${response.statusText}` };
      }

      if (response.ok) {
        if (data.role !== 'admin') {
          // Block standard user
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          setError('Access Denied: Administrator privileges required.');
          setIsLoading(false);
          return;
        }

        // Save admin token
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || data.message || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        console.log('Backend is unreachable or blocked by CORS');
      }
      alert(err.message);
      setError(`Server connection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-smart-bg dark:bg-black flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-2xl border border-smart-light/20 max-w-md w-full relative overflow-hidden">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-smart-dark to-smart-light"></div>

        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-smart-light/10 rounded-full flex items-center justify-center border border-smart-light/30">
            <svg className="w-8 h-8 text-smart-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
        </div>

        <h2 className="text-3xl font-black text-smart-dark dark:text-white text-center tracking-tighter uppercase mb-2 italic">Secure Access</h2>
        <p className="text-smart-gray dark:text-gray-400 text-center text-sm font-medium mb-8 uppercase tracking-widest">System Administrators Only</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-200 rounded-r font-medium text-sm shadow-inner">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-smart-dark dark:text-smart-light mb-2 uppercase tracking-widest">Admin Username / Email</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-smart-bg dark:bg-gray-700 border border-smart-light/20 text-smart-dark dark:text-white rounded-xl focus:ring-2 focus:ring-smart-light focus:border-transparent outline-none transition font-medium"
              placeholder="admin@smartpark.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-smart-dark dark:text-smart-light mb-2 uppercase tracking-widest">Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-smart-bg dark:bg-gray-700 border border-smart-light/20 text-smart-dark dark:text-white rounded-xl focus:ring-2 focus:ring-smart-light focus:border-transparent outline-none transition font-medium tracking-widest"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full font-black py-4 uppercase tracking-widest text-sm rounded-xl transition-all flex items-center justify-center space-x-2 ${isLoading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-smart-light hover:bg-smart-dark text-white shadow-lg hover:-translate-y-0.5 active:scale-95'}`}
          >
            {isLoading ? 'Authenticating...' : 'Establish Secure Connection'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
