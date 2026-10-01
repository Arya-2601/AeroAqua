import React, { useState } from 'react';
import {
  MapPin,
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Phone,
  Mail,
  User,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';

const SUPPORTED_REGIONS = ['Delhi', 'Maharashtra', 'Gujarat'];

const REGION_CITIES = {
  Delhi: ['New Delhi', 'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Rohini', 'Okhla', 'Narela'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Navi Mumbai', 'Chhatrapati Sambhajinagar', 'Kolhapur', 'Solapur', 'Amravati', 'Vasai-Virar', 'Kalyan', 'Panvel'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Vapi', 'Anand', 'Bharuch', 'Navsari'],
};

export default function PublicZoneRequestModal({
  isOpen,
  onClose,
  currentRegion = 'Delhi',
  onRequestSubmitted,
}) {
  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState(currentRegion || 'Delhi');
  const [city, setCity] = useState(REGION_CITIES[currentRegion]?.[0] || 'New Delhi');
  const [areaLocality, setAreaLocality] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!applicantName.trim()) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please provide at least one contact method (Email or Phone number) for verification.');
      return;
    }
    if (!areaLocality.trim()) {
      setError('Area / Locality name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        applicant_name: applicantName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        region,
        city: city.trim(),
        area_locality: areaLocality.trim(),
        pincode: pincode.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        reason: reason.trim() || undefined,
        description: description.trim() || undefined,
      };

      const res = await api.submitZoneRequest(payload);
      setSubmittedData(res);
      if (onRequestSubmitted) onRequestSubmitted(res);
    } catch (err) {
      console.error('Failed to submit zone request:', err);
      setError(err.response?.data?.detail || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedData(null);
    setError(null);
    setApplicantName('');
    setEmail('');
    setPhone('');
    setAreaLocality('');
    setPincode('');
    setLatitude('');
    setLongitude('');
    setReason('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                Request Environmental Monitoring Coverage
              </h3>
              <p className="text-[11px] text-slate-400">
                Petition state authorities for a new air quality station
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

        {submittedData ? (
          /* Confirmation State with Reference ID */
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-base">
                Zone Coverage Request Submitted!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your petition has been recorded for review by the <strong>{submittedData.region} Environmental Authority</strong>.
              </p>
            </div>

            {/* Reference ID Pill */}
            <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 inline-block text-left w-full space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider">
                  Request Reference ID
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {submittedData.status}
                </span>
              </div>
              <div className="font-mono text-base font-black text-slate-900">
                {submittedData.reference_id || `ZR-2026-${submittedData.id.toString().padStart(4, '0')}`}
              </div>
              <p className="text-[11px] text-slate-600">
                Area: <strong>{submittedData.area_locality}</strong>, {submittedData.city} ({submittedData.region})
              </p>
            </div>

            <p className="text-[11px] text-slate-500">
              Authorities periodically aggregate citizen petitions to prioritize physical station deployments.
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
            <div className="p-3 bg-sky-50 border border-sky-200 text-sky-950 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="font-semibold block text-sky-900">Contact Details Required:</strong>
                Your contact details are collected so the authority can verify and follow up on this submission.
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Contact Information Fields */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                1. Your Identification Details
              </span>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g. Ramesh Kulkarni"
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
                      placeholder="ramesh@example.com"
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
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Geographic Coverage Details */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                2. Requested Locality Details
              </span>

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
                  Area / Locality / Sector <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kalyan West Khadakpada, Vapi GIDC, Rohini Sector 16"
                  value={areaLocality}
                  onChange={(e) => setAreaLocality(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 421301"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude (Optional)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 19.2450"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono text-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude (Optional)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 73.1350"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none font-mono text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Request</label>
                <input
                  type="text"
                  placeholder="e.g. High traffic corridor, near industrial area, residential school hub"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or local environmental conditions observed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
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
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting Petition...' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
