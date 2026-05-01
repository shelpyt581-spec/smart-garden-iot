import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BookingPage = () => {
  const [tickets, setTickets] = useState({
    child: 0,
    adult: 0,
    senior: 0
  });
  const [subscriptionType, setSubscriptionType] = useState('one-time');
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const pricingTiers = {
    'one-time': { child: 100, adult: 200, senior: 150 },
    'monthly': { child: 1500, adult: 3000, senior: 2000 }
  };

  const currentPrices = pricingTiers[subscriptionType];

  // Redirect to login if no token is found
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  const handleIncrement = (type) => {
    setTickets(prev => ({ ...prev, [type]: prev[type] + 1 }));
  };

  const handleDecrement = (type) => {
    setTickets(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
  };

  const totalPrice = (tickets.child * currentPrices.child) + (tickets.adult * currentPrices.adult) + (tickets.senior * currentPrices.senior);

  const handleProceed = (e) => {
    e.preventDefault();
    setError('');

    if (totalPrice === 0) {
      setError('Please select at least one ticket to proceed.');
      return;
    }

    if (!subscriptionType) {
      setError('Please select a subscription duration.');
      return;
    }

    if (subscriptionType === 'one-time' && !selectedDate) {
      setError('Please select a visit date.');
      return;
    }

    navigate('/payment', { 
      state: { 
        tickets, 
        subscriptionType, 
        totalPrice,
        selectedDate
      } 
    });
  };

  return (
    <div className="min-h-screen bg-smart-bg dark:bg-black flex flex-col transition-colors duration-300">
      <main className="flex-grow max-w-5xl mx-auto px-6 py-12 flex items-center justify-center w-full">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full border border-smart-light/30 dark:border-smart-light/10">
          
          {/* Info Side */}
          <div className="bg-smart-dark p-10 text-white flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-4xl font-extrabold mb-6 text-smart-glow">Select Your Passes</h2>
              <p className="text-white/80 text-lg mb-8 leading-relaxed">
                Choose the tickets that best fit your group. Our monthly subscriptions offer unlimited access to all IoT park features.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-smart-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <span className="text-lg font-medium">Access to all inclusive paths</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-smart-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <span className="text-lg font-medium">Smart app navigation</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-smart-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <span className="text-lg font-medium">Priority support</span>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="p-10 flex-1 bg-white dark:bg-gray-800 flex flex-col justify-center">
            {error && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 rounded-r-lg font-medium shadow-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleProceed} className="space-y-8">

              {/* Subscription Type Toggle */}
              <div>
                <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-4 uppercase tracking-wider">Duration</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer border-2 rounded-xl p-5 text-center transition-all ${subscriptionType === 'one-time' ? 'border-smart-light bg-smart-light/5 dark:bg-smart-light/10 text-smart-dark dark:text-white font-extrabold shadow-sm transform scale-105' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-smart-light/40 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <input 
                      type="radio" 
                      name="subscriptionType" 
                      value="one-time" 
                      className="hidden"
                      checked={subscriptionType === 'one-time'}
                      onChange={() => setSubscriptionType('one-time')}
                    />
                    <div className="text-xl mb-1">One-Time</div>
                    <div className="text-sm opacity-80 font-normal">Valid for 24 hours</div>
                  </label>
                  
                  <label className={`relative cursor-pointer border-2 rounded-xl p-5 text-center transition-all ${subscriptionType === 'monthly' ? 'border-smart-light bg-smart-light/5 dark:bg-smart-light/10 text-smart-dark dark:text-white font-extrabold shadow-sm transform scale-105' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-smart-light/40 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <input 
                      type="radio" 
                      name="subscriptionType" 
                      value="monthly" 
                      className="hidden"
                      checked={subscriptionType === 'monthly'}
                      onChange={() => setSubscriptionType('monthly')}
                    />
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-lg transform rotate-3">Best Value!</span>
                    <div className="text-xl mb-1">Monthly</div>
                    <div className="text-sm opacity-80 font-normal">Unlimited access</div>
                  </label>
                </div>
              </div>
              
              {/* Visit Date */}
              {subscriptionType === 'one-time' && (
                <div className="animate-fade-in-up">
                  <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-4 uppercase tracking-wider">Select Visit Date</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition bg-smart-bg dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-bold text-smart-dark dark:text-white"
                  />
                </div>
              )}

              {/* Ticket Quantities */}
              <div>
                <label className="block text-sm font-extrabold text-smart-dark dark:text-white mb-4 uppercase tracking-wider">Ticket Quantities</label>
                <div className="space-y-4">
                  
                  {/* Child */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-smart-light/40 transition-colors">
                    <div>
                      <h4 className="font-bold text-smart-dark dark:text-white text-lg">Child</h4>
                      <p className="text-sm text-smart-light font-bold transition-all">{currentPrices.child} EGP</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button type="button" onClick={() => handleDecrement('child')} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-white font-bold transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                      </button>
                      <span className="font-extrabold text-xl w-6 text-center text-smart-dark dark:text-white">{tickets.child}</span>
                      <button type="button" onClick={() => handleIncrement('child')} className="w-10 h-10 rounded-full bg-smart-light/10 dark:bg-smart-light/20 hover:bg-smart-light/20 text-smart-light flex items-center justify-center font-bold transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  </div>

                  {/* Adult */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-smart-light/40 transition-colors">
                    <div>
                      <h4 className="font-bold text-smart-dark dark:text-white text-lg">Adult</h4>
                      <p className="text-sm text-smart-light font-bold transition-all">{currentPrices.adult} EGP</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button type="button" onClick={() => handleDecrement('adult')} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-white font-bold transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                      </button>
                      <span className="font-extrabold text-xl w-6 text-center text-smart-dark dark:text-white">{tickets.adult}</span>
                      <button type="button" onClick={() => handleIncrement('adult')} className="w-10 h-10 rounded-full bg-smart-light/10 dark:bg-smart-light/20 hover:bg-smart-light/20 text-smart-light flex items-center justify-center font-bold transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  </div>

                  {/* Senior */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-smart-light/40 transition-colors">
                    <div>
                      <h4 className="font-bold text-smart-dark dark:text-white text-lg">Senior</h4>
                      <p className="text-sm text-smart-light font-bold transition-all">{currentPrices.senior} EGP</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button type="button" onClick={() => handleDecrement('senior')} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-white font-bold transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                      </button>
                      <span className="font-extrabold text-xl w-6 text-center text-smart-dark dark:text-white">{tickets.senior}</span>
                      <button type="button" onClick={() => handleIncrement('senior')} className="w-10 h-10 rounded-full bg-smart-light/10 dark:bg-smart-light/20 hover:bg-smart-light/20 text-smart-light flex items-center justify-center font-bold transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Dynamic Total Price */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-1">Total Price</p>
                  <p className="text-4xl font-black text-smart-dark dark:text-smart-glow transition-all">{totalPrice} <span className="text-xl text-gray-500 dark:text-gray-400 font-medium italic">EGP</span></p>
                </div>
                <button 
                  type="submit" 
                  className="bg-smart-light hover:bg-smart-dark text-white font-extrabold py-4 px-8 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                >
                  Proceed to Payment
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
