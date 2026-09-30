import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  KeyRound,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Droplets,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SUPPORTED_REGIONS = ['Delhi', 'Maharashtra', 'Gujarat'];

export default function Login() {
  const { user, login, logout, currentRegion, setCurrentRegion } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('authority');
  const [password, setPassword] = useState('admin123');
  const [selectedRole, setSelectedRole] = useState('authority');
  const [selectedRegion, setSelectedRegion] = useState(currentRegion || 'Delhi');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username, password, selectedRole, selectedRegion);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(`Authenticated successfully as ${result.user.role.toUpperCase()} in ${selectedRegion}`);
      setTimeout(() => {
        navigate('/');
      }, 600);
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = async (roleType, region = selectedRegion) => {
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
    setSelectedRegion(region);
    const result = await login(u, p, r, region);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(`Session established as ${roleType.toUpperCase()} (${region})`);
      setTimeout(() => {
        navigate('/');
      }, 500);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-lg w-full space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-[#071A2F] to-sky-700 text-white rounded-2xl shadow-sm">
            <Wind className="w-7 h-7 text-sky-300 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            AeroAqua Platform Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Environmental intelligence, cross-domain telemetry, and authority emergency broadcasting portal.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          {/* Current Active Session Pill */}
          {user && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500">Current authenticated session:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md uppercase tracking-wider text-[11px] ${
                  user.role === 'authority'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-sky-100 text-sky-900 border border-sky-300'
                }`}
              >
                {user.role} ({user.region || currentRegion})
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Role Preset (Hackathon Access)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('authority')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition-all ${
                  selectedRole === 'authority'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-1 ring-amber-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Authority Operations</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">
                  Zone management, broadcast &amp; spike
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('citizen')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-start gap-1 transition-all ${
                  selectedRole === 'citizen'
                    ? 'bg-sky-50/80 border-sky-300 text-sky-950 ring-1 ring-sky-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-sky-800">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Citizen Advisory</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">
                  Public telemetry &amp; live advisories
                </span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase font-semibold">
              Or Sign In with Credentials
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-medium"
                  placeholder="authority or citizen"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none font-medium"
                  placeholder="••••••••"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Classification & Region Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Classification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Classification
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('citizen');
                      if (username === 'authority') setUsername('citizen');
                      if (password === 'admin123') setPassword('citizen123');
                    }}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                      selectedRole === 'citizen'
                        ? 'bg-white text-sky-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Citizen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('authority');
                      if (username === 'citizen') setUsername('authority');
                      if (password === 'citizen123') setPassword('admin123');
                    }}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                      selectedRole === 'authority'
                        ? 'bg-white text-amber-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Authority
                  </button>
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Region / State
                </label>
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {SUPPORTED_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2 pt-2.5"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
