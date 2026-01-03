
import React, { useState } from 'react';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { addToWaitlist } from '../services/supabaseService';

const WaitlistForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    const result = await addToWaitlist(email);
    
    setStatus(result.success ? 'success' : 'error');
    setMessage(result.message);

    if (result.success) {
      setEmail('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setStatus('idle');
                setMessage('');
              }}
              placeholder="Enter official government email..."
              disabled={status === 'loading' || status === 'success'}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[100px] justify-center"
          >
            {status === 'loading' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              'Join Pilot'
            )}
          </button>
        </div>
        
        {message && (
          <div className={`mt-3 text-sm flex items-center gap-2 animate-in slide-in-from-top-2 ${
            status === 'success' ? 'text-green-600' : 'text-red-500'
          }`}>
            {status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {message}
          </div>
        )}
      </form>
      <p className="text-center text-xs text-slate-400 mt-3">
        Join 50+ municipal corporations already using CivicCare AI.
      </p>
    </div>
  );
};

export default WaitlistForm;
