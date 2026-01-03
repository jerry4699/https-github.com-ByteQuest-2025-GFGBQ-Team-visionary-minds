
import React, { useState, useRef } from 'react';
import { Camera, Mic, MapPin, Send, Loader2, Info, CheckCircle2, Volume2, ShieldCheck } from 'lucide-react';
import { analyzeGrievance, speakText, getPolicyInfo } from '../services/geminiService';
import { Grievance, GrievanceStatus, Priority } from '../types';

interface CitizenPortalProps {
  onGrievanceSubmit: (g: Grievance) => void;
}

// Utility to decode base64 strings (replaces prohibited external library dependencies)
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Decodes raw PCM audio data into an AudioBuffer as per Gemini API documentation
const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const CitizenPortal: React.FC<CitizenPortalProps> = ({ onGrievanceSubmit }) => {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [policyInfo, setPolicyInfo] = useState<{ text: string, sources: any[] } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`
        });
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
        alert('Could not retrieve location. Please check permissions.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const analysis = await analyzeGrievance(description, image || undefined);
      
      const newGrievance: Grievance = {
        id: `G-${Math.floor(Math.random() * 9000 + 1000)}`,
        citizenName: 'User Guest', // Simplified
        category: analysis.category,
        description,
        location: location || undefined,
        priority: analysis.priority as Priority,
        status: GrievanceStatus.PENDING,
        timestamp: new Date().toISOString(),
        department: analysis.department,
        evidenceUrls: image ? [image] : [],
        aiAnalysis: {
          sentiment: 'Neutral',
          suggestedResolution: analysis.suggestedResolution,
          urgencyReason: analysis.urgencyReason
        }
      };

      onGrievanceSubmit(newGrievance);
      setShowSuccess(true);
      setDescription('');
      setImage(null);
      setLocation(null);
      
      // Auto-hide success message
      setTimeout(() => setShowSuccess(false), 5000);

    } catch (err) {
      console.error(err);
      alert('Failed to process grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkPolicy = async () => {
    if (!description) return;
    const info = await getPolicyInfo(description);
    setPolicyInfo(info);
  };

  // Uses AudioContext to decode and play the raw PCM stream returned by Gemini
  const listenToPolicy = async () => {
    if (!policyInfo) return;
    const audioData = await speakText(policyInfo.text);
    if (audioData) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const decodedBytes = decode(audioData);
        const audioBuffer = await decodeAudioData(decodedBytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      } catch (error) {
        console.error('Audio playback failed', error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          Report an Issue. <span className="text-blue-600">Empower Your City.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Use our AI-powered portal to report civic issues. We'll automatically route your complaint to the right department for faster resolution.
        </p>
      </section>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <CheckCircle2 className="text-green-600 shrink-0" />
          <p className="font-medium">Grievance submitted successfully! AI has routed it to the relevant department.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Describe the issue</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Large pothole on Ring Road near Central Park..."
                className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                required
              />

              <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${image ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Camera size={18} />
                    {image ? 'Photo Added' : 'Add Photo'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${location ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {isGettingLocation ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
                    {location ? 'Location Shared' : 'Share Location'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !description}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Submit Report
                      <Send size={18} />
                    </>
                  )}
                </button>
              </div>

              {image && (
                <div className="relative mt-4 group">
                  <img src={image} alt="Evidence" className="w-full h-48 object-cover rounded-xl" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Policy Information Section */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Info size={20} />
                <h3>Government Policy Guide</h3>
              </div>
              <button
                onClick={checkPolicy}
                className="text-xs font-semibold uppercase tracking-wider text-indigo-600 hover:text-indigo-800"
              >
                Search Policies
              </button>
            </div>
            
            {policyInfo ? (
              <div className="space-y-4">
                <div className="text-slate-700 text-sm leading-relaxed prose prose-slate">
                  {policyInfo.text}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={listenToPolicy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                  >
                    <Volume2 size={16} />
                    Listen
                  </button>
                </div>
                {policyInfo.sources?.length > 0 && (
                  <div className="pt-4 border-t border-indigo-100">
                    <p className="text-xs font-bold text-indigo-400 mb-2 uppercase">Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {policyInfo.sources.map((src: any, idx: number) => (
                        <a 
                          key={idx} 
                          href={src.web?.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {src.web?.title || 'Gov Source'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-indigo-400 italic">
                Describe your issue above, then click 'Search Policies' to see relevant rules and regulations.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Tips */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900">How it works</h4>
            <ul className="space-y-3">
              {[
                { icon: <Mic size={16} />, text: 'Speak or type your grievance.' },
                { icon: <Camera size={16} />, text: 'AI analyzes visual evidence.' },
                { icon: <ShieldCheck size={16} />, text: 'Prioritized by severity automatically.' },
                { icon: <Send size={16} />, text: 'Sent to the correct department.' }
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600">
                  <span className="shrink-0 text-blue-500 mt-0.5">{step.icon}</span>
                  {step.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg">
            <h4 className="font-bold mb-2">Did you know?</h4>
            <p className="text-sm text-blue-100 leading-relaxed">
              AI classification reduces grievance processing time by up to 60%, ensuring critical infrastructure repairs happen faster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenPortal;
