import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Wind,
  ArrowRight,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SUPPORTED_REGIONS = ['Delhi', 'Maharashtra', 'Gujarat'];

export default function Login() {
  const { user, login, currentRegion } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('authority');
  const [password, setPassword] = useState('admin123');
  const [selectedRegion, setSelectedRegion] = useState(currentRegion || 'Delhi');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username, password, 'authority', selectedRegion);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(`Authenticated successfully as State Authority for ${selectedRegion}`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } else {
      setError(result.error);
    }
  };

  const handleQuickRegionLogin = async (region) => {
    setError(null);
    setLoading(true);
    setSelectedRegion(region);
    setUsername('authority');
    setPassword('admin123');
    const result = await login('authority', 'admin123', 'authority', region);
    setLoading(false);
    if (result.success) {
      setSuccessMsg(`Session established as ${region} Authority`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 400);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full space-y-6">
        {/* Back Link */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Role Selection</span>
          </Link>
        </div>

        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-[#071A2F] to-amber-700 text-white rounded-2xl shadow-sm">
            <Shield className="w-7 h-7 text-amber-300 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            Authority Operations Sign In
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            State-isolated operational access for monitoring zone management, public request review, and emergency broadcasting.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          {/* Active Session Notice if logged in */}
          {user && user.role === 'authority' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-amber-800">Current authenticated session:</span>
              <span className="font-bold px-2 py-0.5 rounded-md uppercase tracking-wider text-[11px] bg-amber-200 text-amber-950 border border-amber-300">
                {user.region || currentRegion} Authority
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

          {/* Quick Authority State Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick State Authorization
            </span>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickRegionLogin(r)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    selectedRegion === r
                      ? 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{r}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              Or Sign In with Credentials
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                State / Operational Region
              </label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {SUPPORTED_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r} Operations
                    </option>
                  ))}
                </select>
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Authority Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  placeholder="authority"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

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
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  placeholder="••••••••"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2 pt-2.5"
            >
              <span>{loading ? 'Authenticating Authority...' : 'Sign In as Authority'}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
