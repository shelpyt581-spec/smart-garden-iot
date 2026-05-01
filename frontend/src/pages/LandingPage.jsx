import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [hasDisability, setHasDisability] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const url = isLogin 
      ? 'http://localhost:5000/api/login' 
      : 'http://localhost:5000/api/register';
    
    const payload = isLogin 
      ? { email, password }
      : { name, email, phone, age: Number(age), hasDisability, password, role: 'user' };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role || 'user');
        navigate('/book');
      } else {
        setError(data.message || 'Authentication failed. Please try again.');
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
    <div className="flex flex-col min-h-screen bg-smart-bg dark:bg-black transition-colors duration-300">
      <main className="flex-grow flex flex-col md:flex-row max-w-6xl mx-auto px-6 py-12 gap-12 items-center">
        {/* Features Section */}
        <div className="flex-1 space-y-8" id="features">
          <div>
            <h2 className="text-4xl font-extrabold text-smart-dark dark:text-smart-glow mb-4 italic tracking-tight">Welcome to the Future of Parks</h2>
            <p className="text-lg text-smart-gray dark:text-gray-400 leading-relaxed font-medium">
              Experience a sustainable, tech-driven environment designed for everyone. Our park utilizes cutting-edge IoT technology to enhance your visit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-smart-light/20 dark:border-gray-700 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-smart-light/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-smart-light transition-colors">
                <svg className="w-6 h-6 text-smart-light group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-smart-dark dark:text-white mb-2">Inclusive Ramps</h3>
              <p className="text-smart-gray dark:text-gray-400">Smart sensors detect wheelchair access and automatically light the path for safety.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-smart-light/20 dark:border-gray-700 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-smart-dark/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-smart-dark transition-colors">
                <svg className="w-6 h-6 text-smart-dark group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-smart-dark dark:text-white mb-2">Smart Bins</h3>
              <p className="text-smart-gray dark:text-gray-400">Connected waste bins notify maintenance when full, keeping the park pristine.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-smart-light/20 dark:border-gray-700 hover:shadow-md transition-all sm:col-span-2 group">
              <div className="w-12 h-12 bg-smart-light/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-smart-light transition-colors">
                <svg className="w-6 h-6 text-smart-light group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-smart-dark dark:text-white mb-2">Automated Irrigation</h3>
              <p className="text-smart-gray dark:text-gray-400">Soil moisture sensors ensure our greenery gets exactly the water it needs, conserving resources.</p>
            </div>
          </div>
        </div>

        {/* Login/Signup Section */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-md" id="login">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-smart-light/30 dark:border-smart-light/20 transition-colors">
            <h2 className="text-3xl font-black text-smart-dark dark:text-smart-glow mb-6 text-center italic">
              {isLogin ? 'Visitor Login' : 'Create Account'}
            </h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 rounded-r-lg font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-2 uppercase tracking-wide">Full Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition bg-smart-bg dark:bg-gray-700 text-smart-dark dark:text-white font-medium"
                      placeholder="John Doe"
                      required={!isLogin}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-2 uppercase tracking-wide">Age</label>
                      <input 
                        type="number" 
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition bg-smart-bg dark:bg-gray-700 text-smart-dark dark:text-white font-medium"
                        placeholder="25"
                        min="1"
                        max="120"
                        required={!isLogin}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-2 uppercase tracking-wide">Phone Number</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition bg-smart-bg dark:bg-gray-700 text-smart-dark dark:text-white font-medium"
                        placeholder="555-0192"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div className="flex items-center mt-2 p-3 bg-smart-bg dark:bg-gray-700 rounded-xl border border-smart-light/10">
                    <input 
                      type="checkbox" 
                      id="hasDisability"
                      checked={hasDisability}
                      onChange={(e) => setHasDisability(e.target.checked)}
                      className="w-5 h-5 text-smart-light border-gray-300 dark:border-gray-500 rounded focus:ring-smart-light cursor-pointer"
                    />
                    <label htmlFor="hasDisability" className="ml-3 block text-sm font-medium text-smart-gray dark:text-gray-300 cursor-pointer select-none">
                      I require accessibility features
                    </label>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-2 uppercase tracking-wide">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition bg-smart-bg dark:bg-gray-700 text-smart-dark dark:text-white font-medium"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-2 uppercase tracking-wide">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition bg-smart-bg dark:bg-gray-700 text-smart-dark dark:text-white font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full font-black py-4 rounded-xl transition-all shadow-lg hover:-translate-y-1 ${isLoading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-smart-light hover:bg-smart-dark text-white hover:shadow-2xl'}`}
              >
                {isLoading ? 'Processing...' : (isLogin ? 'Sign In & Book Tickets' : 'Register & Book Tickets')}
              </button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-smart-gray dark:text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }} 
                  className="ml-2 text-smart-light dark:text-smart-glow font-black hover:underline"
                >
                  {isLogin ? "Register here" : "Sign in here"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
