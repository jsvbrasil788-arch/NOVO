
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Settings, 
  FileText, 
  Plus, 
  Trash2, 
  Share2, 
  Construction, 
  Home,
  ChevronRight,
  User,
  Sparkles,
  BarChart3,
  Camera,
  X,
  MessageSquare,
  Wand2,
  BrainCircuit,
  Loader2,
  TrendingUp,
  Heart
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  UserProfile, 
  DailyEntry, 
  ExtraActivity, 
  ServiceType, 
  TabType 
} from './types';
import { 
  formatTime, 
  calculateTotalTime, 
  getCurrentMonthEntries, 
  getMonthYearString 
} from './utils';

const DEFAULT_COVER = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop";

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('diary');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : {
      name: '',
      serviceType: ServiceType.AUXILIARY,
      monthlyGoal: 30,
      whatsappNumber: '',
      coverPhoto: DEFAULT_COVER,
      profilePicture: undefined
    };
  });

  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    const saved = localStorage.getItem('daily_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [extras, setExtras] = useState<ExtraActivity[]>(() => {
    const saved = localStorage.getItem('extra_activities');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Initial Animation ---
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('daily_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('extra_activities', JSON.stringify(extras));
  }, [extras]);

  // --- Gemini Functions ---
  const refineNotesWithAi = async () => {
    if (!tempNotes.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refine esta nota de relatório de pregação para que fique mais profissional e encorajadora em português, sem perder os detalhes principais: "${tempNotes}"`,
      });
      if (response.text) {
        setTempNotes(response.text.trim());
      }
    } catch (error) {
      console.error("Erro ao refinar com Gemini:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateInsights = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataStr = JSON.stringify({
        fieldHours: totalField.hours,
        studies: totalStudies,
        notes: currentMonthEntries.map(e => e.notes).filter(Boolean)
      });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Com base nos dados deste mês de um pioneiro, gere um resumo motivacional curto (máximo 4 frases) em português. Analise o esforço e dê uma sugestão espiritual baseada nas notas: ${dataStr}`,
      });
      if (response.text) {
        setAiInsights(response.text.trim());
      }
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Calculations ---
  const currentMonthEntries = useMemo(() => getCurrentMonthEntries(entries), [entries]);
  const currentMonthExtras = useMemo(() => getCurrentMonthEntries(extras), [extras]);

  const totalField = calculateTotalTime(currentMonthEntries);
  const totalStudies = currentMonthEntries.reduce((sum, e) => sum + e.bibleStudies, 0);
  const totalCredits = calculateTotalTime(currentMonthExtras);

  const chartData = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let i = 2; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = targetDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      const monthEntries = entries.filter(entry => {
        const d = new Date(entry.date);
        return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
      });
      const total = calculateTotalTime(monthEntries);
      result.push({
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        hours: total.hours + (total.minutes / 60),
        displayHours: total.hours
      });
    }
    return result;
  }, [entries]);

  const maxHoursInChart = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.hours), profile.monthlyGoal);
    return maxVal || 1; 
  }, [chartData, profile.monthlyGoal]);

  const isReminderDay = useMemo(() => {
    const day = new Date().getDate();
    return day >= 25;
  }, []);

  // --- Handlers ---
  const handleAddEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newEntry: DailyEntry = {
      id: crypto.randomUUID(),
      date: formData.get('date') as string || new Date().toISOString(),
      hours: Number(formData.get('hours')),
      minutes: Number(formData.get('minutes')),
      bibleStudies: Number(formData.get('studies')),
      notes: tempNotes
    };
    setEntries(prev => [...prev, newEntry]);
    setTempNotes('');
    e.currentTarget.reset();
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Deseja excluir este registro?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverPhoto' | 'profilePicture') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem é muito grande. Escolha uma de até 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const sendToWhatsApp = () => {
    if (!profile.whatsappNumber) {
      alert('Por favor, defina um número de WhatsApp nas configurações.');
      setActiveTab('settings');
      return;
    }
    const message = `*Meu Relatório – ${getMonthYearString().toUpperCase()}*\n\n` +
      `*Nome:* ${profile.name || 'Pioneiro'}\n` +
      `*Horas de Campo:* ${totalField.hours}h${totalField.minutes > 0 ? ` ${totalField.minutes}m` : ''}\n` +
      `*Estudos Bíblicos:* ${totalStudies}\n` +
      `*Créditos Extras:* ${totalCredits.hours}h${totalCredits.minutes > 0 ? ` ${totalCredits.minutes}m` : ''}\n\n` +
      `_Enviado com amor pelo Meu Relatório_ 🕊️`;

    const cleanPhone = profile.whatsappNumber.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- UI Components ---
  const ProgressBar = ({ current, goal }: { current: number; goal: number }) => {
    const percentage = Math.min((current / goal) * 100, 100);
    return (
      <div className="w-full bg-indigo-50 rounded-full h-4 mb-1 overflow-hidden shadow-inner">
        <div 
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-100/30 rounded-full blur-3xl -ml-32 -mb-32 animate-pulse"></div>
        
        <div className="relative animate-bounce-slow">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-300 transform rotate-12">
            <BookOpen size={44} className="text-white -rotate-12" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-lg">
            <Heart size={20} className="text-rose-400 fill-rose-400" />
          </div>
        </div>
        
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Meu Relatório</h1>
          <div className="mt-2 flex justify-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F1F5F9] flex flex-col pb-28 shadow-2xl relative overflow-hidden font-inter transition-all duration-500">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-40 left-0 w-80 h-80 bg-cyan-200/20 rounded-full -ml-40 blur-3xl"></div>
      </div>

      {/* Modern Hero Section */}
      <div className="relative h-64 w-full overflow-hidden shrink-0 shadow-lg">
        <img 
          src={profile.coverPhoto || DEFAULT_COVER} 
          alt="Capa" 
          className="w-full h-full object-cover transition-transform duration-[2s] hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F1F5F9] via-transparent to-indigo-900/40"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2.5rem] shadow-2xl">
            <p className="text-white text-sm font-medium italic mb-2 leading-relaxed drop-shadow-lg">
              "Portanto, vão e façam discípulos de pessoas de todas as nações..."
            </p>
            <div className="h-0.5 w-12 bg-white/40 mx-auto mb-2 rounded-full"></div>
            <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-lg">
              Mateus 28:19
            </p>
          </div>
        </div>
      </div>

      {/* Elegant Header Card */}
      <header className="mx-8 -mt-10 bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-6 flex items-center justify-between shadow-2xl shadow-indigo-900/5 z-10 transition-all hover:scale-[1.02]">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">Meu Relatório</h1>
          <div className="flex items-center gap-1.5 text-indigo-500">
            <Calendar size={14} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-widest">{getMonthYearString()}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-3 rounded-[1.8rem] shadow-xl shadow-indigo-200 ring-4 ring-indigo-50">
          <BookOpen size={24} />
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 px-6 pt-8 space-y-8 overflow-y-auto">
        
        {/* TAB: DIARY */}
        {activeTab === 'diary' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8 pb-4">
            {isReminderDay && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-400 p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-200 border border-white/20 overflow-hidden relative group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-xl">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-black text-lg tracking-tight leading-none">Quase lá! ✨</h3>
                    <p className="text-indigo-50 text-xs mt-1.5 font-medium leading-snug">
                      Hora de consolidar seu belo serviço deste mês.
                    </p>
                    <button 
                      onClick={() => setActiveTab('report')}
                      className="mt-4 bg-white text-indigo-600 text-[10px] font-black py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-all hover:pr-8"
                    >
                      GERAR RELATÓRIO <ChevronRight size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Entry Form */}
            <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Novo Registro</h2>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                </div>
              </div>
              
              <form onSubmit={handleAddEntry} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 ml-1">DATA</label>
                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl text-xs font-bold border border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 ml-1">ESTUDOS</label>
                    <input name="studies" type="number" defaultValue="0" min="0" className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl text-xs font-bold border border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all shadow-inner" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 ml-1">HORAS</label>
                    <input name="hours" type="number" required defaultValue="1" min="0" className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl text-xs font-bold border border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 ml-1">MINUTOS</label>
                    <input name="minutes" type="number" required defaultValue="0" min="0" max="59" className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl text-xs font-bold border border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all shadow-inner" />
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-slate-500 ml-1">NOTAS</label>
                  <textarea 
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-50 px-5 py-4 rounded-[2rem] text-xs font-medium border border-transparent focus:border-indigo-200 focus:bg-white outline-none h-28 resize-none transition-all pr-14 shadow-inner"
                  />
                  <button 
                    type="button"
                    onClick={refineNotesWithAi}
                    disabled={!tempNotes.trim() || isAiLoading}
                    className="absolute bottom-4 right-4 p-3 bg-white text-indigo-600 rounded-2xl hover:scale-110 disabled:opacity-0 transition-all shadow-lg border border-indigo-50"
                  >
                    {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                  </button>
                </div>

                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] transition-all shadow-2xl shadow-slate-300 flex items-center justify-center gap-3 active:scale-95 text-xs uppercase tracking-widest group">
                  <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /> 
                  SALVAR REGISTRO
                </button>
              </form>
            </div>

            {/* History List */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Histórico Mensal</h3>
              {currentMonthEntries.length === 0 ? (
                <div className="text-center py-16 bg-white/60 backdrop-blur rounded-[3rem] border border-dashed border-slate-200">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 text-xs font-bold">Nenhum registro ainda este mês.</p>
                </div>
              ) : (
                currentMonthEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                  <div key={entry.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="bg-indigo-50 text-indigo-600 h-14 w-14 rounded-[1.5rem] flex flex-col items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                          <span className="text-[9px] font-black uppercase leading-none mb-1.5 opacity-60">DIA</span>
                          <span className="text-xl font-black leading-none">{new Date(entry.date).getDate() + 1}</span>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-base">{formatTime(entry.hours, entry.minutes)}</p>
                          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{entry.bibleStudies} estudos</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-slate-200 hover:text-rose-500 transition-all p-3 bg-slate-50 rounded-2xl hover:bg-rose-50">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    {entry.notes && (
                      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-[1.8rem] border border-slate-100/50">
                        <MessageSquare size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 italic leading-relaxed font-medium">
                          {entry.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: REPORT */}
        {activeTab === 'report' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8 pb-4">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-indigo-900/10 border border-white relative overflow-hidden transition-all hover:scale-[1.01]">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-50 rounded-full opacity-60 blur-[100px] pointer-events-none"></div>
              
              <div className="relative z-10 space-y-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="bg-indigo-600 text-white w-20 h-20 rounded-[1.8rem] shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50 flex items-center justify-center overflow-hidden">
                      {profile.profilePicture ? (
                        <img src={profile.profilePicture} alt="Perfil" className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{profile.name || 'Pioneiro'}</h2>
                    <span className="mt-2 inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-indigo-100">
                      {profile.serviceType}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-inner">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">HORAS CAMPO</p>
                    <p className="text-3xl font-black text-indigo-600">{totalField.hours}<span className="text-lg opacity-40 ml-1">h</span></p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-inner">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">ESTUDOS</p>
                    <p className="text-3xl font-black text-cyan-600">{totalStudies}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meta de Horas</p>
                    <p className="text-sm text-slate-800 font-black">{totalField.hours} / {profile.monthlyGoal}h</p>
                  </div>
                  <ProgressBar current={totalField.hours} goal={profile.monthlyGoal} />
                </div>

                {/* AI Insights Panel */}
                <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-[2.5rem] border border-indigo-100/50 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500 p-2 rounded-xl">
                        <BrainCircuit className="text-white" size={18} />
                      </div>
                    </div>
                    {!aiInsights && !isAiLoading && (
                      <button 
                        onClick={generateInsights}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-indigo-100"
                      >
                        <Wand2 size={14} /> ANALISAR
                      </button>
                    )}
                  </div>
                  
                  {isAiLoading ? (
                    <div className="py-4 space-y-3 animate-pulse">
                      <div className="h-2.5 bg-indigo-100/50 rounded-full w-full"></div>
                      <div className="h-2.5 bg-indigo-100/50 rounded-full w-4/5"></div>
                    </div>
                  ) : aiInsights ? (
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold italic text-center px-2">
                      {aiInsights}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold text-center italic">Clique em analisar para ver seu resumo mensal.</p>
                  )}
                </div>

                <button 
                  onClick={sendToWhatsApp}
                  className="send-report-btn w-full bg-[#25D366] hover:scale-[1.02] text-white font-black py-6 rounded-[2.5rem] transition-all shadow-2xl shadow-green-200 flex items-center justify-center gap-3 text-sm uppercase tracking-[0.1em]"
                >
                  <Share2 size={24} strokeWidth={2.5} /> ENVIAR RELATÓRIO
                </button>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-cyan-500" size={20} />
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Desempenho Trimestral</h3>
              </div>
              <div className="flex items-end justify-around h-40 gap-4 px-2">
                {chartData.map((data, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full">
                    <div className="flex-1 w-full flex items-end">
                      <div 
                        className={`w-full rounded-[1.2rem] transition-all duration-1000 ease-out hover:brightness-110 cursor-help ${idx === 2 ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-2xl shadow-indigo-100' : 'bg-slate-100'}`}
                        style={{ height: `${Math.max(12, (data.hours / maxHoursInChart) * 100)}%` }}
                      >
                        <div className="w-full text-center -mt-8 text-[10px] font-black text-slate-800">
                          {data.displayHours}h
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] mt-4 font-black text-slate-400 uppercase tracking-tighter">{data.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: EXTRAS */}
        {activeTab === 'extras' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
             <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
               <div className="flex items-center justify-between">
                 <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Atividades Extras</h2>
                 <Construction className="text-indigo-500" size={20} />
               </div>
               <p className="text-xs text-slate-400 font-bold text-center italic leading-relaxed">
                 Registre suas horas de construção e manutenção.<br/>Esses créditos somam ao seu total mensal.
               </p>
             </div>
           </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8 pb-10">
            {/* Profile Picture Header */}
            <div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-[3rem] bg-indigo-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                  {profile.profilePicture ? (
                    <img src={profile.profilePicture} alt="Foto de perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-indigo-200" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl shadow-xl cursor-pointer hover:bg-indigo-700 transition-colors active:scale-90 ring-4 ring-white">
                  <Camera size={20} />
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profilePicture')} className="hidden" />
                </label>
                {profile.profilePicture && (
                  <button 
                    onClick={() => setProfile(p => ({...p, profilePicture: undefined}))}
                    className="absolute -top-2 -left-2 bg-rose-500 text-white p-2 rounded-xl shadow-lg hover:bg-rose-600 transition-colors ring-4 ring-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">{profile.name || 'Seu Nome'}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sua Identidade</p>
            </div>

            {/* Cover Photo Settings */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Foto da Capa</h2>
                <Camera className="text-slate-400" size={18} />
              </div>
              <div className="relative group rounded-[2.5rem] overflow-hidden h-36 bg-slate-100 border-4 border-white shadow-inner">
                <img src={profile.coverPhoto || DEFAULT_COVER} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <label className="bg-white p-3 rounded-2xl cursor-pointer text-indigo-600 hover:bg-indigo-50 shadow-xl transition-all active:scale-90">
                    <Plus size={24} strokeWidth={3} />
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverPhoto')} className="hidden" />
                  </label>
                  <button onClick={() => setProfile(p => ({...p, coverPhoto: DEFAULT_COVER}))} className="bg-white p-3 rounded-2xl text-rose-500 hover:bg-rose-50 shadow-xl transition-all active:scale-90">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {/* Personal Data Form */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Informações Pessoais</h2>
                <Settings className="text-slate-400" size={20} />
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 ml-2">SEU NOME</label>
                  <input type="text" value={profile.name} onChange={(e) => setProfile(p => ({...p, name: e.target.value}))} className="w-full bg-slate-50 px-6 py-4 rounded-[1.8rem] text-sm font-bold border border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 ml-2">WHATSAPP</label>
                  <input type="tel" value={profile.whatsappNumber} onChange={(e) => setProfile(p => ({...p, whatsappNumber: e.target.value}))} className="w-full bg-slate-50 px-6 py-4 rounded-[1.8rem] text-sm font-bold border border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all shadow-inner" placeholder="11999999999" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 ml-2">MODALIDADE</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setProfile(p => ({...p, serviceType: ServiceType.AUXILIARY, monthlyGoal: 30}))} 
                      className={`py-4 px-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${profile.serviceType === ServiceType.AUXILIARY ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                    >
                      Auxiliar
                    </button>
                    <button 
                      onClick={() => setProfile(p => ({...p, serviceType: ServiceType.REGULAR, monthlyGoal: 50}))} 
                      className={`py-4 px-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${profile.serviceType === ServiceType.REGULAR ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                    >
                      Regular
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50/50 p-8 rounded-[3rem] border border-rose-100 text-center">
               <h3 className="text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">Zona de Perigo</h3>
               <button 
                 onClick={() => { if(confirm('Excluir todos os registros permanentemente?')) { localStorage.clear(); window.location.reload(); } }} 
                 className="text-[10px] font-black text-rose-400 hover:text-rose-600 underline decoration-rose-200 underline-offset-4"
               >
                 LIMPAR TODOS OS DADOS DO APP
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Modern Tab Bar */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white/70 backdrop-blur-3xl border border-white/50 px-10 py-5 flex justify-between items-center max-w-md mx-auto shadow-[0_20px_50px_rgba(30,58,138,0.15)] z-[60] rounded-[3rem]">
        <button onClick={() => setActiveTab('diary')} className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'diary' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-indigo-300'}`}>
          <Home size={26} strokeWidth={activeTab === 'diary' ? 3 : 2} />
          <div className={`w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1 transition-all ${activeTab === 'diary' ? 'opacity-100' : 'opacity-0'}`}></div>
        </button>
        <button onClick={() => setActiveTab('extras')} className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'extras' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-indigo-300'}`}>
          <Construction size={26} strokeWidth={activeTab === 'extras' ? 3 : 2} />
          <div className={`w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1 transition-all ${activeTab === 'extras' ? 'opacity-100' : 'opacity-0'}`}></div>
        </button>
        <button onClick={() => setActiveTab('report')} className={`flex flex-col items-center transition-all duration-500 ${activeTab === 'report' ? 'scale-110' : 'hover:scale-105'}`}>
          <div className={`p-5 rounded-[2.2rem] -mt-16 transition-all duration-500 shadow-2xl ring-8 ring-[#F1F5F9]/80 ${activeTab === 'report' ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-indigo-300 rotate-12' : 'bg-white text-slate-300 border border-slate-100'}`}>
            <BarChart3 size={32} strokeWidth={2.5} />
          </div>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'settings' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-indigo-300'}`}>
          <Settings size={26} strokeWidth={activeTab === 'settings' ? 3 : 2} />
          <div className={`w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1 transition-all ${activeTab === 'settings' ? 'opacity-100' : 'opacity-0'}`}></div>
        </button>
      </nav>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-10px) rotate(15deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite ease-in-out;
        }
        
        .send-report-btn:active {
          animation: tap-bounce 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes tap-bounce {
          0% { transform: scale(1); filter: brightness(1); }
          40% { transform: scale(0.9); filter: brightness(1.2); }
          100% { transform: scale(0.95); filter: brightness(1); }
        }

        ::-webkit-scrollbar {
          width: 0px;
        }
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default App;
