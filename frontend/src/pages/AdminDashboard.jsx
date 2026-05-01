import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [manualTicketId, setManualTicketId] = useState('');
  const [scanMessage, setScanMessage] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const scannerRef = useRef(null);

  // Fetch crowd insights
  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch('http://localhost:5000/api/tickets/insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/admin');
      return;
    }

    const fetchData = async () => {
      try {
        const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else if (statsRes.status === 401 || statsRes.status === 403) {
          handleLogout();
          return;
        }

        const usersRes = await fetch('http://localhost:5000/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchData();
    fetchInsights();
    
    // Poll insights every 60 seconds
    const interval = setInterval(fetchInsights, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to refresh stats", error);
    }
  };

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, []);

  const handleScanRequest = async (idToScan) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setScanMessage({ type: 'error', text: 'Auth token missing. Please log in again.' });
      return;
    }

    try {
      setScanMessage(null); // Clear previous message
      const response = await fetch('http://localhost:5000/api/admin/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticketId: idToScan })
      });

      const data = await response.json();

      if (response.ok) {
        setScanMessage({ type: 'success', text: data.message });

        // Refresh stats immediately
        fetchStats();

      } else {
        setScanMessage({ type: 'error', text: data.message || 'Scan failed' });
        if (response.status === 401 || response.status === 403) {
          console.error('Admin Authorization Error:', data.message);
        }
      }
    } catch (error) {
      console.error(error);
      if (error.response) {
        console.log(error.response);
      }
      setScanMessage({ type: 'error', text: 'Network error or server down.' });
    }
  };

  const onScanSuccess = (decodedText) => {
    let finalId = decodedText;

    // Check if it's a JWT from our system
    try {
      const parts = decodedText.split('.');
      if (parts.length === 3) {
        // Decode the base64 payload
        const payload = JSON.parse(atob(parts[1]));
        if (payload && payload.ticketId) {
          finalId = payload.ticketId;
        }
      }
    } catch (e) {
      // Not a JWT, use raw string
    }

    handleScanRequest(finalId);
  };

  const onScanFailure = (error) => {
    // Ignore routine scan errors (e.g. no QR in frame)
  };

  const handleManualOverride = (e) => {
    e.preventDefault();
    const cleanId = manualTicketId.trim();
    if (cleanId) {
      handleScanRequest(cleanId);
      setManualTicketId('');
    }
  };

  const handleBlockUser = async (userId, currentStatus) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/block`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: !currentStatus } : u));
      }
    } catch (error) {
      console.error("Failed to toggle block status", error);
    }
  };

  const handleResetOccupancy = async () => {
    if (!window.confirm('Are you sure you want to reset the park occupancy? This will archive all currently scanned tickets. This action cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/admin/reset-occupancy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Park occupancy has been reset successfully.');
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to reset occupancy');
      }
    } catch (error) {
      console.error("Reset Occupancy Error:", error);
      alert('Network error while resetting occupancy.');
    }
  };

  const [alerts] = useState([
    { id: 1, time: '10:42 AM', message: 'Zone B recycling bin is full.', type: 'warning' },
    { id: 2, time: '10:38 AM', message: 'RFID Ramp deployed at Main Gate.', type: 'info' },
    { id: 3, time: '10:15 AM', message: 'Soil moisture low in Sector 4. Irrigation started.', type: 'action' },
    { id: 4, time: '09:55 AM', message: 'Pet food dispenser #2 refilled.', type: 'success' },
    { id: 5, time: '09:12 AM', message: 'Visual guidance audio node #12 triggered.', type: 'info' },
  ]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-smart-bg dark:bg-black font-sans flex flex-col transition-colors duration-300">
      <header className="bg-smart-dark dark:bg-black text-white shadow-2xl py-4 px-8 flex justify-between items-center z-10 border-b border-smart-light/20">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-smart-light rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(128,194,65,0.4)]">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.071 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white italic uppercase">Admin Control Panel</h1>
            <p className="text-smart-light/80 text-xs font-bold uppercase tracking-widest">Smart Park Ecosystem</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black transition-all shadow-lg hover:shadow-red-900/40 flex items-center space-x-2 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          <span className="uppercase tracking-widest text-xs">Secure Logout</span>
        </button>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          <div className="bg-white dark:bg-gray-800 rounded-[35px] p-8 shadow-xl border border-smart-light/10 dark:border-gray-700 flex flex-col justify-center transform transition-transform hover:-translate-y-1">
            <h3 className="text-smart-gray dark:text-gray-400 font-black text-[10px] uppercase tracking-widest mb-3">Total Tickets Sold</h3>
            <div className="flex items-end space-x-4">
              {isLoadingStats ? (
                <span className="text-lg font-bold text-gray-400 animate-pulse">Analyzing...</span>
              ) : (
                <span className="text-5xl font-black text-smart-dark dark:text-white italic">{stats?.totalTicketsSold || 0}</span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[35px] p-8 shadow-xl border border-smart-light/10 dark:border-gray-700 flex flex-col justify-center transform transition-transform hover:-translate-y-1 ring-2 ring-smart-light/20">
            <h3 className="text-smart-gray dark:text-gray-400 font-black text-[10px] uppercase tracking-widest mb-3">Current Park Occupancy</h3>
            <div className="flex items-end space-x-3 mb-3">
              {isLoadingStats ? (
                <span className="text-lg font-bold text-gray-400 animate-pulse">Analyzing...</span>
              ) : (
                <div className="flex items-baseline space-x-2">
                  <span className="text-5xl font-black text-smart-light italic">{stats?.currentOccupancy || 0}</span>
                  <span className="text-smart-gray dark:text-gray-500 font-bold text-lg">/ 1000</span>
                </div>
              )}
            </div>
            {!isLoadingStats && (
              <>
                <div className="w-full bg-smart-bg dark:bg-gray-900 rounded-full h-3 overflow-hidden border border-smart-light/10 mb-6">
                  <div className="bg-smart-light h-3 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(128,194,65,0.5)]" style={{ width: `${stats?.capacityPercentage || 0}%` }}></div>
                </div>
                <button
                  onClick={handleResetOccupancy}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-red-900/40 active:scale-95"
                >
                  Reset Park Occupancy
                </button>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[35px] p-8 shadow-xl border border-smart-light/10 dark:border-gray-700 flex flex-col justify-center transform transition-transform hover:-translate-y-1">
            <h3 className="text-smart-gray dark:text-gray-400 font-black text-[10px] uppercase tracking-widest mb-4">Most Sold Ticket</h3>
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 bg-smart-light/10 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-smart-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                {isLoadingStats ? (
                  <span className="text-sm font-bold text-gray-400 animate-pulse">Analyzing...</span>
                ) : (
                  <span className="block text-xl font-black text-smart-dark dark:text-white leading-tight uppercase italic">{stats?.mostSoldTicket || 'N/A'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[35px] p-8 shadow-xl border border-smart-light/10 dark:border-gray-700 flex flex-col justify-center transform transition-transform hover:-translate-y-1">
            <h3 className="text-smart-gray dark:text-gray-400 font-black text-[10px] uppercase tracking-widest mb-4">User Statistics</h3>
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-smart-glow/10 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-smart-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <div>
                {isLoadingStats ? (
                  <span className="text-sm font-bold text-gray-400 animate-pulse">Analyzing...</span>
                ) : (
                  <>
                    <span className="block text-3xl font-black text-smart-dark dark:text-white italic">{stats?.purchasingUsers || 0}</span>
                    <span className="block text-smart-gray dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest">of {stats?.activeUsers || 0} Total</span>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Crowd Insights Panel */}
        <div className="mb-10 bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-smart-light/10 dark:border-gray-700 overflow-hidden">
          <div className="bg-smart-bg dark:bg-gray-900 px-8 py-6 border-b border-smart-light/10 flex justify-between items-center">
            <h2 className="text-xl font-black text-smart-dark dark:text-white flex items-center tracking-tighter uppercase italic">
              <svg className="w-6 h-6 mr-3 text-smart-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              This Week's Crowd Insights
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Auto-refresh: 60s</span>
            </div>
          </div>
          <div className="p-8">
            {loadingInsights ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-smart-light"></div>
              </div>
            ) : insights && (
              <>
                <div className="grid grid-cols-7 gap-4 mb-6">
                  {insights.days.map((day, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-2xl text-center ${day.isToday ? 'ring-2 ring-smart-light bg-smart-light/5' : 'bg-smart-bg/30 dark:bg-gray-900/50'}`}
                    >
                      <div className="text-xs font-black text-gray-500 dark:text-gray-400 mb-2">{day.dayName}</div>
                      <div className={`w-full h-12 rounded-xl flex items-center justify-center ${day.crowdLevel === 'quiet' ? 'bg-green-100 dark:bg-green-900/30' : day.crowdLevel === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <span className={`text-lg font-black ${day.crowdLevel === 'quiet' ? 'text-green-600' : day.crowdLevel === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {day.count}
                        </span>
                      </div>
                      <div className={`text-xs font-black mt-2 ${day.crowdLevel === 'quiet' ? 'text-green-600' : day.crowdLevel === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {day.crowdLevel === 'quiet' ? '🟢 Quiet' : day.crowdLevel === 'moderate' ? '🟡 Moderate' : '🔴 Busy'}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{day.displayDate}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-8 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-500 dark:text-gray-400">Quiet (0-30%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-500 dark:text-gray-400">Moderate (31-70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-500 dark:text-gray-400">Busy (71-100%)</span>
                  </div>
                  <div className="text-gray-400 dark:text-gray-500">
                    Daily Capacity: {insights.capacity}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mb-10 bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-smart-light/10 dark:border-gray-700 overflow-hidden">
          <div className="bg-smart-bg dark:bg-gray-900 px-8 py-6 border-b border-smart-light/10 flex justify-between items-center">
            <h2 className="text-xl font-black text-smart-dark dark:text-white flex items-center tracking-tighter uppercase italic">
              <svg className="w-6 h-6 mr-3 text-smart-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              User Management
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-smart-bg dark:bg-gray-900 border-b border-smart-light/10 text-smart-gray dark:text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5 pl-8">Name</th>
                  <th className="p-5">Email</th>
                  <th className="p-5 text-center">Security Status</th>
                  <th className="p-5 pr-8 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-smart-bg dark:divide-gray-700">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-smart-bg/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-5 pl-8 font-black text-smart-dark dark:text-white italic capitalize">{user.name}</td>
                    <td className="p-5 text-smart-gray dark:text-gray-400 font-medium">{user.email}</td>
                    <td className="p-5 text-center">
                      {user.isBlocked ? (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-200 dark:border-red-800">Blocked</span>
                      ) : (
                        <span className="bg-smart-light/10 dark:bg-smart-light/20 text-smart-dark dark:text-smart-glow text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-smart-light/20">Active</span>
                      )}
                    </td>
                    <td className="p-5 pr-8 text-right">
                      <button
                        onClick={() => handleBlockUser(user._id, user.isBlocked)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${user.isBlocked ? 'bg-smart-light text-white hover:bg-smart-dark shadow-md' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white border border-red-200 dark:border-red-800 shadow-sm'}`}
                      >
                        {user.isBlocked ? 'Unblock Access' : 'Restrict Access'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-smart-gray dark:text-gray-500 font-black uppercase tracking-widest">No standard users detected in system.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-full">

          <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-smart-light/10 dark:border-gray-700 overflow-hidden flex flex-col min-h-[600px]">
            <div className="bg-smart-bg dark:bg-gray-900 px-8 py-6 border-b border-smart-light/10 flex justify-between items-center">
              <h2 className="text-xl font-black text-smart-dark dark:text-white flex items-center tracking-tighter uppercase italic">
                <svg className="w-6 h-6 mr-3 text-smart-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                Gate QR Scanner
              </h2>
              <div className="flex items-center space-x-3 bg-smart-light/10 dark:bg-smart-light/20 px-4 py-1.5 rounded-full border border-smart-light/20">
                <div className="w-2 h-2 bg-smart-light rounded-full animate-ping"></div>
                <span className="text-[10px] text-smart-dark dark:text-smart-glow font-black uppercase tracking-widest">Hardware Online</span>
              </div>
            </div>

            <div className="flex-grow flex flex-col bg-smart-dark/5 dark:bg-black p-10">

              {scanMessage && (
                <div className={`mb-8 p-6 rounded-2xl font-black text-center text-sm shadow-xl border-2 transform animate-fade-in ${scanMessage.type === 'success' ? 'bg-smart-light/20 border-smart-light text-smart-dark dark:text-smart-glow' : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {scanMessage.text}
                </div>
              )}

              <div id="reader" className="w-full max-w-md mx-auto bg-white dark:bg-gray-700 rounded-[30px] overflow-hidden shadow-2xl border-4 border-smart-dark dark:border-smart-light/50 ring-8 ring-smart-bg dark:ring-gray-900"></div>

            </div>

            <div className="bg-smart-bg dark:bg-gray-900 p-8 border-t border-smart-light/10">
              <form onSubmit={handleManualOverride} className="flex flex-col space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={manualTicketId}
                    onChange={(e) => setManualTicketId(e.target.value)}
                    placeholder="ENTER TICKET IDENTIFIER..."
                    className="w-full px-6 py-5 rounded-2xl border-2 border-smart-light/20 bg-white dark:bg-gray-800 text-smart-dark dark:text-white focus:ring-4 focus:ring-smart-light/20 focus:border-smart-light outline-none transition font-mono text-xs font-black tracking-widest"
                  />
                  <svg className="w-5 h-5 absolute right-6 top-1/2 -translate-y-1/2 text-smart-light/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01"></path></svg>
                </div>
                <button type="submit" className="w-full py-5 bg-smart-light hover:bg-smart-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:shadow-smart-light/20 active:scale-95">
                  Manual Entry Override
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border border-smart-light/10 dark:border-gray-700 flex flex-col min-h-[600px]">
            <div className="bg-smart-bg dark:bg-gray-900 px-8 py-6 border-b border-smart-light/10 flex justify-between items-center">
              <h2 className="text-xl font-black text-smart-dark dark:text-white flex items-center tracking-tighter uppercase italic">
                <svg className="w-6 h-6 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Hardware Grid Alerts
              </h2>
              <div className="flex items-center space-x-2 bg-smart-bg dark:bg-gray-800 px-4 py-1.5 rounded-full border border-smart-light/10">
                <div className="w-2 h-2 bg-smart-light rounded-full animate-pulse"></div>
                <span className="text-[10px] text-smart-gray dark:text-gray-500 font-black uppercase tracking-widest">Real-time Stream</span>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-5 rounded-[25px] bg-smart-bg/30 dark:bg-gray-900/50 border border-smart-light/5 hover:border-smart-light/20 transition-all group">
                  <div className="flex items-start">
                    <div className="mt-1.5 mr-5">
                      {alert.type === 'warning' && (
                        <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.7)] group-hover:scale-125 transition-transform"></div>
                      )}
                      {alert.type === 'info' && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.7)] group-hover:scale-125 transition-transform"></div>
                      )}
                      {alert.type === 'action' && (
                        <div className="w-4 h-4 bg-smart-light rounded-full shadow-[0_0_12px_rgba(128,194,65,0.7)] group-hover:scale-125 transition-transform"></div>
                      )}
                      {alert.type === 'success' && (
                        <div className="w-4 h-4 bg-smart-glow rounded-full shadow-[0_0_12px_rgba(178,255,74,0.7)] group-hover:scale-125 transition-transform"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-smart-dark dark:text-gray-200 font-black text-[15px] italic leading-snug">{alert.message}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <svg className="w-3 h-3 text-smart-gray dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-[10px] text-smart-gray dark:text-gray-500 font-black uppercase tracking-tighter">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-smart-bg dark:bg-gray-900 p-6 border-t border-smart-light/10 text-center">
              <button className="text-smart-light font-black text-[11px] hover:text-smart-dark dark:hover:text-white transition-all uppercase tracking-widest border-b-2 border-transparent hover:border-smart-light pb-1">
                Establish Full Diagnostic Link
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
