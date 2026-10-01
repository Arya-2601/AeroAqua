import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Flame,
  Droplets,
  Factory,
  HelpCircle,
} from 'lucide-react';
import api from '../services/api';

const SUPPORTED_REGIONS = ['Delhi', 'Maharashtra', 'Gujarat'];

const REGION_CITIES = {
  Delhi: ['New Delhi', 'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Rohini', 'Okhla', 'Narela'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Navi Mumbai', 'Chhatrapati Sambhajinagar', 'Kolhapur', 'Solapur', 'Amravati', 'Vasai-Virar', 'Kalyan', 'Panvel'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Vapi', 'Anand', 'Bharuch', 'Navsari'],
};

export default function PublicReportModal({
  isOpen,
  onClose,
  currentRegion = 'Delhi',
  onReportSubmitted,
}) {
  const [reporterName, setReporterName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('air_pollution');
  const [region, setRegion] = useState(currentRegion || 'Delhi');
  const [city, setCity] = useState(REGION_CITIES[currentRegion]?.[0] || 'New Delhi');
  const [areaLocality, setAreaLocality] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!reporterName.trim()) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please provide at least one contact method (Email or Phone number) for verification.');
      return;
    }
    if (!areaLocality.trim()) {
      setError('Area / Locality is required.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide a detailed description of the environmental issue (min 5 characters).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reporter_name: reporterName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        category,
        region,
        city: city.trim(),
        area_locality: areaLocality.trim(),
        description: description.trim(),
        photo_url: photoUrl.trim() || undefined,
      };

      const res = await api.submitCitizenReport(payload);
      setSubmittedReport(res);
      if (onReportSubmitted) onReportSubmitted(res);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError(err.response?.data?.detail || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedReport(null);
    setError(null);
    setReporterName('');
    setEmail('');
    setPhone('');
    setAreaLocality('');
    setDescription('');
    setPhotoUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Report Environmental Issue
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct incident report to state environmental authorities
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedReport ? (
          /* Confirmation State with Reference ID */
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-base">
                Environmental Report Submitted
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your incident report has been routed to the <strong>{submittedReport.region} Environmental Control Room</strong>.
              </p>
            </div>

            {/* Reference ID Card */}
            <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 inline-block text-left w-full space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">
                  Report Reference ID
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  {submittedReport.status}
                </span>
              </div>
              <div className="font-mono text-base font-black text-slate-900">
                {submittedReport.reference_id || `REP-2026-${submittedReport.id.toString().padStart(4, '0')}`}
              </div>
              <p className="text-[11px] text-slate-700">
                Category: <strong className="uppercase">{submittedReport.category.replace('_', ' ')}</strong> • Location: <strong>{submittedReport.area_locality}</strong>, {submittedReport.city}
              </p>
            </div>

            <p className="text-[11px] text-slate-500">
              State inspection teams will review the details and initiate necessary verification measures.
            </p>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
            {/* Identity & Verification Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="font-semibold block text-amber-900">Verification Details:</strong>
                Your contact details are collected so the authority can verify and follow up on this submission.
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reporter Contact Information */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                1. Reporter Identification
              </span>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 91234 56789"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Category */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                2. Incident Category &amp; Location
              </span>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'air_pollution', label: 'Air Pollution', icon: Flame },
                    { id: 'water_concern', label: 'Water Concern', icon: Droplets },
                    { id: 'industrial_activity', label: 'Industrial Activity', icon: Factory },
                    { id: 'other', label: 'Other', icon: HelpCircle },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className="text-[10px] leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State / Region</label>
                  <select
                    value={region}
                    onChange={(e) => {
                      const newR = e.target.value;
                      setRegion(newR);
                      setCity(REGION_CITIES[newR]?.[0] || '');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium cursor-pointer"
                  >
                    {SUPPORTED_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium cursor-pointer"
                  >
                    {(REGION_CITIES[region] || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Area / Street / Landmark <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Chembur Flyover, GIDC Phase 2, Ring Road"
                  value={areaLocality}
                  onChange={(e) => setAreaLocality(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description of Observation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe visible emissions, odor, discolored runoff, or unusual industrial discharge..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Optional Photo URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Logging Report...' : 'Submit Incident Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
