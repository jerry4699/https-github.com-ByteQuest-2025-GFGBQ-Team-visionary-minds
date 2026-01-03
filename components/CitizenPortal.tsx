
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, MapPin, Send, Loader2, Info, CheckCircle2, Volume2, ShieldCheck, StopCircle, Mic2, Square, Clock, ChevronRight, Phone, Image as ImageIcon, X } from 'lucide-react';
import { analyzeGrievance, speakText, getPolicyInfo, transcribeAudio } from '../services/geminiService';
import { Grievance, GrievanceStatus, Priority } from '../types';

interface CitizenPortalProps {
  onGrievanceSubmit: (g: Grievance) => void;
  recentGrievances?: Grievance[];
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
  // Use byteOffset and length to ensure we respect views if the array is a subarray
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
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

const CitizenPortal: React.FC<CitizenPortalProps> = ({ onGrievanceSubmit, recentGrievances = [] }) => {
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // New optional field
  const [images, setImages] = useState<string[]>([]); // Changed to array for multiple images
  const [location, setLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [policyInfo, setPolicyInfo] = useState<{ text: string, sources: any[] } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // TTS State
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup audio context on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const remainingSlots = 3 - images.length;
      if (remainingSlots <= 0) {
        alert("Maximum 3 images allowed.");
        return;
      }
      
      const filesToProcess = Array.from(e.target.files).slice(0, remainingSlots);
      
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscribe(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Strip the data:audio/webm;base64, prefix
        const base64Data = base64String.split(',')[1];
        
        const transcription = await transcribeAudio(base64Data);
        if (transcription) {
          setDescription(prev => (prev ? `${prev} ${transcription}` : transcription));
        }
        setIsTranscribing(false);
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      setIsTranscribing(false);
      alert('Failed to transcribe audio. Please try again.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const analysis = await analyzeGrievance(description, images);
      
      const newGrievance: Grievance = {
        id: `G-${Math.floor(Math.random() * 9000 + 1000)}`,
        citizenName: 'User Guest', // Simplified
        citizenPhone: phoneNumber || undefined,
        category: analysis.category,
        description,
        location: location || undefined,
        priority: analysis.priority as Priority,
        status: GrievanceStatus.PENDING,
        timestamp: new Date().toISOString(),
        department: analysis.department,
        evidenceUrls: images,
        // Default values for city and state, will be updated by parent component based on jurisdiction
        city: 'New Delhi',
        state: 'Delhi',
        aiAnalysis: {
          sentiment: 'Neutral',
          suggestedResolution: analysis.suggestedResolution,
          urgencyReason: analysis.urgencyReason,
          language: analysis.language,
          urgencyScore: analysis.urgencyScore,
          imageAnalysis: analysis.imageAnalysis
        }
      };

      onGrievanceSubmit(newGrievance);
      setShowSuccess(true);
      setDescription('');
      setImages([]);
      setPhoneNumber('');
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
    setPolicyInfo(null); // Reset prev info
    const info = await getPolicyInfo(description);
    setPolicyInfo(info);
  };

  // Uses AudioContext to decode and play the raw PCM stream returned by Gemini
  const listenToPolicy = async () => {
    if (!policyInfo) return;
    
    // If already playing, stop it
    if (isPlayingAudio) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // Use text-to-speech
      const audioData = await speakText(policyInfo.text);
      
      if (audioData) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        
        // Ensure context is running (browsers often suspend it until interaction)
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const decodedBytes = decode(audioData);
        // Ensure even byte length for Int16Array (16-bit PCM)
        const alignedBytes = decodedBytes.length % 2 !== 0 
            ? decodedBytes.subarray(0, decodedBytes.length - 1) 
            : decodedBytes;

        const audioBuffer = await decodeAudioData(alignedBytes, ctx, 24000, 1);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
          setIsPlayingAudio(false);
          audioSourceRef.current = null;
        };

        audioSourceRef.current = source;
        source.start();
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error('Audio playback failed', error);
      alert('Unable to play audio. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          Report an Issue. <span className="text-blue-600">Empower Your City.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Use our AI-powered portal to report civic issues. Speak or type — we'll route your complaint to the right department instantly.
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
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700">Describe the issue</label>
                <div className="flex items-center gap-2">
                   {isTranscribing && (
                    <span className="text-xs font-medium text-blue-600 animate-pulse flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Transcribing audio...
                    </span>
                   )}
                   {isRecording && (
                    <span className="text-xs font-medium text-red-600 animate-pulse flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Listening...
                    </span>
                   )}
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Type here or click the microphone to speak..."
                  className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isTranscribing}
                  className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                    isRecording 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title={isRecording ? "Stop Recording" : "Start Voice Input"}
                >
                  {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
              </div>

               {/* Optional Phone Number */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Phone Number <span className="text-slate-400 font-normal">(Optional - for updates only)</span>
                  </label>
                  <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g., 98765 43210"
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                  </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= 3}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${images.length > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Camera size={18} />
                    {images.length > 0 ? `Added (${images.length}/3)` : 'Add Photos'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
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

              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-slate-400">Upload photos to help officers understand the issue. AI assists by checking image relevance and quality.</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative group shrink-0 w-24 h-24">
                                <img src={img} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover rounded-lg border border-slate-200" />
                                <button 
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute -top-2 -right-2 bg-slate-900 text-white p-0.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
          </form>

          {/* Recent Grievances Timeline */}
          {recentGrievances.length > 0 && (
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2">
                     <Clock size={16} className="text-blue-500" />
                     Your Request History
                   </h3>
                   <span className="text-xs font-medium text-slate-400">{recentGrievances.length} Reports</span>
                </div>
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                   {recentGrievances.map(g => (
                      <div key={g.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                         <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            g.status === GrievanceStatus.RESOLVED ? 'bg-green-500' :
                            g.status === GrievanceStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-amber-500'
                         }`} />
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                               <span className="font-semibold text-slate-900 text-sm truncate pr-2">{g.department}</span>
                               <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(g.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 mb-2">{g.description}</p>
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-mono text-slate-400">{g.id}</span>
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                  g.status === GrievanceStatus.RESOLVED ? 'bg-green-50 text-green-700' :
                                  g.status === GrievanceStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                               }`}>
                                  {g.status.replace('_', ' ')}
                               </span>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

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
                    disabled={isGeneratingAudio}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                       isPlayingAudio 
                         ? 'bg-red-100 text-red-700 hover:bg-red-200'
                         : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isGeneratingAudio ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Generating Audio...
                        </>
                    ) : isPlayingAudio ? (
                        <>
                            <Square size={16} fill="currentColor" />
                            Stop Listening
                        </>
                    ) : (
                        <>
                            <Volume2 size={16} />
                            Listen
                        </>
                    )}
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
                { icon: <Mic2 size={16} />, text: 'Speak or type your grievance.' },
                { icon: <Camera size={16} />, text: 'Upload photos (optional).' },
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
