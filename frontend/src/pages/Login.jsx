import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, KeyRound, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth, AVAILABLE_REGIONS } from '../context/AuthContext';

export default function Login() {
  const { user, login, logout, currentRegion, setCurrentRegion } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('authority');
  const [password, setPassword] = useState('admin123');
  const [selectedRole, setSelectedRole] = useState('authority');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username, password, selectedRole, currentRegion);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(`Authenticated successfully as ${result.user.role.toUpperCase()}`);
      setTimeout(() => {
        navigate('/');
      }, 700);
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = async (roleType) => {
    setError(null);
    setLoading(true);
    let u = 'citizen';
    let p = 'citizen123';
    let r = 'citizen';
    if (roleType === 'authority') {
      u = 'authority';
      p = 'admin123';
      r = 'authority';
    }
    setUsername(u);
    setPassword(p);
    setSelectedRole(r);
    const result = await login(u, p, r, currentRegion);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(`Quick-authenticated as ${roleType.toUpperCase()}`);
      setTimeout(() => {
        navigate('/');
      }, 500);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portal Authentication</h1>
          <p className="text-xs text-slate-500">
            Switch between Citizen public advisory mode and Authority broadcast operations.
          </p>
        </div>

        {/* Current Session Status */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-500">Current active role:</span>
          <span className={`font-semibold px-2 py-0.5 rounded ${
            user?.role === 'authority' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {user?.role?.toUpperCase() || 'CITIZEN'} ({user?.username})
          </span>
        </div>

        {/* Quick Demo Switchers */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Quick One-Click Demo Access
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('authority')}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Shield className="w-4 h-4 text-amber-700" />
              <span>Authority Role</span>
              <span className="text-[10px] text-amber-700 font-normal">Broadcast / Resolve Alerts</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('citizen')}
              className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <User className="w-4 h-4 text-blue-700" />
              <span>Citizen Role</span>
              <span className="text-[10px] text-blue-700 font-normal">Public Advisories</span>
            </button>
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-medium">Or enter credentials</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email or Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="authority@aeroaqua.org or citizen"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="••••••••"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Classification / Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('citizen');
                  if (username === 'authority') setUsername('citizen');
                  if (password === 'admin123') setPassword('citizen123');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'citizen'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Citizen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('authority');
                  if (username === 'citizen') setUsername('authority');
                  if (password === 'citizen123') setPassword('admin123');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                  selectedRole === 'authority'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Authority</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Operational Region</label>
            <div className="relative">
              <select
                value={currentRegion}
                onChange={(e) => setCurrentRegion(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {AVAILABLE_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2 text-xs">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {user && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              &larr; Return to Dashboard
            </button>
            <button
              type="button"
              onClick={logout}
              className="text-slate-500 hover:text-rose-600 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
