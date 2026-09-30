import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'general',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contact AeroAqua Intelligence</h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          For state pollution control board integrations, open-data queries, municipal telemetry access, or platform inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Direct Inquiries</h3>
            <p className="text-xs text-slate-500 mt-1">support@aeroaqua.internal</p>
            <p className="text-xs text-slate-500">api@aeroaqua.internal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Emergency Hotlines</h3>
            <p className="text-xs text-slate-500 mt-1">Delhi CPCB Desk: +91 11 2230 5792</p>
            <p className="text-xs text-slate-500">Toll-free Advisory: 1800-180-AERO</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">HQ Center</h3>
            <p className="text-xs text-slate-500 mt-1">
              Environmental Monitoring Division, New Delhi, India
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Message Received</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Thank you for contacting the AeroAqua team. Our environmental intelligence liaison will review your request.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Dr. Rajesh Sharma"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="rajesh@pcb.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Organization</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="general">Public / Citizen Inquiry</option>
                <option value="pcb">State Pollution Control Board (SPCB)</option>
                <option value="municipal">Municipal Corporation</option>
                <option value="research">Academic / Environmental Research</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry / Feedback</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Details of your inquiry or station telemetry data request..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Inquiry</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
