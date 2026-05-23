import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect, useRef, useCallback } from "react";

// Icons and UI Components
const TargetIcon = () => (
  <div className="w-5 h-5 rounded-full border-[1.5px] border-[#D4AF37] flex items-center justify-center m-0.5">
    <div className="w-2.5 h-2.5 bg-[#D4AF37] rounded-full"></div>
  </div>
);

const DiamondSolid = () => (
  <div className="w-4 h-4 bg-[#E0D8D0] rotate-45 m-1"></div>
);

const CircleSolid = () => (
  <div className="w-5 h-5 bg-[#D4AF37] rounded-full m-0.5"></div>
);

const DiamondOutline = () => (
  <div className="w-4 h-4 border-[1.5px] border-[#E0D8D0] rotate-45 m-1"></div>
);

const BackgroundGridAndCircles = () => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Concentric subtle background rings top right */}
    <div className="absolute top-0 right-0 w-[40vw] max-w-[800px] aspect-square -translate-y-1/3 translate-x-1/4">
      <div className="absolute inset-0 rounded-full border-[1px] border-[#D4AF37]/10 scale-150" />
      <div className="absolute inset-0 rounded-full border-[1.5px] border-[#D4AF37]/20 scale-[1.15]" />
      <div className="absolute inset-0 rounded-full border-[2px] border-[#D4AF37]/30 scale-75 shadow-[0_0_120px_rgba(212,175,55,0.05)]" />
      <div className="absolute inset-0 rounded-full border-[2px] border-[#D4AF37]/40 scale-[0.3]" />
    </div>

    {/* Subtle dot grid */}
    <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 [mask-image:radial-gradient(ellipse_100%_80%_at_50%_10%,#000_10%,transparent_100%)]" />
  </div>
);

const features = [
  {
    title: "Real Chat",
    description: "You, texting directly with a real match",
    icon: <TargetIcon />
  },
  {
    title: "Double Chat",
    description: "Your AI double breaks the ice for you",
    icon: <DiamondSolid />
  },
  {
    title: "Real Meet",
    description: "Video or in-person, fully you",
    icon: <CircleSolid />
  },
  {
    title: "Double Meet",
    description: "Your double video-meets theirs first",
    icon: <DiamondOutline />
  }
];

const stats = [
  { value: "40", unit: "%", label: "of adults are introverted" },
  { value: "$14", unit: "B", label: "dating app market" },
  { value: "4", unit: "x", label: "more connections made" },
];

const agents = [
  { name: 'Vesper', traits: ['Analytical', 'Quietly Witty', 'Arthouse'], interests: ['Semiotics', 'Rhythm', 'Minimal techno'] },
  { name: 'Julian', traits: ['Creative', 'Philosophical', 'Warm'], interests: ['Architecture', 'Brutalism', 'Nabokov'] },
  { name: 'Elena', traits: ['Expressive', 'Idealistic', 'Curious'], interests: ['Art History', 'Contemporary dance', 'Coffee'] },
  { name: 'Leo', traits: ['Energetic', 'Outgoing', 'Practical'], interests: ['Rock climbing', 'Finance', 'Dogs'] },
  { name: 'Maya', traits: ['Intuitive', 'Empathetic', 'Soft-spoken'], interests: ['Gardening', 'Poetry', 'Jazz'] }
];

export default function App() {
  const [view, setView] = useState<'landing' | 'onboarding' | 'chat'>('landing');
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Dashboard state
  const [matches, setMatches] = useState<any[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);
  // Chat history format: { [matchName]: [ {speaker, message, sentiment} ] }
  const [chatHistories, setChatHistories] = useState<Record<string, any[]>>({});

  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // loadMatches needs to be defined before any conditional returns so Hooks stay
  // in the same order across renders. Use useCallback to keep a stable ref.
  const loadMatches = useCallback(async (profile: any) => {
    setIsLoadingMatches(true);
    try {
      const fetchJsonWithTimeout = async (url: string, options: RequestInit, timeoutMs = 30000) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          return response;
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      // 1. Register and get real candidates
      const regRes = await fetchJsonWithTimeout('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      const regData = await regRes.json();
      
      let candidateList = regData.candidates || [];
      if (candidateList.length === 0) {
        // Fallback to mock agents if no other real users are registered
        candidateList = agents;
      } else if (candidateList.length < 5) {
        // Pad with some mock agents to make it look full
        candidateList = [...candidateList, ...agents].slice(0, 5);
      }

      // 2. Fetch matches from AI
      const res = await fetchJsonWithTimeout('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: profile, candidates: candidateList })
      });
      
      if (!res.ok) {
        throw new Error('API Error: AI might not be initialized');
      }

      const data = await res.json();
      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setActiveMatchIndex(0);
      } else {
        throw new Error('No matches returned');
      }
    } catch(e) {
      console.error(e);
      // Fallback
      setMatches(agents.map(a => ({ candidate: a, compatibilityScore: Math.floor(Math.random()*100), reasoning: 'Fallback: AI matching unavailable or failed.' })));
      setActiveMatchIndex(0);
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  // Ensure matches are loaded when onboarding completes and view switches to chat
  useEffect(() => {
    if (view === 'chat' && userProfile) {
      loadMatches(userProfile);
    }
  }, [view, userProfile, loadMatches]);

  

  // ----------------------------------------------------
  // Landing View
  // ----------------------------------------------------
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#050505] text-[#E0D8D0] font-sans relative selection:bg-[#D4AF37]/30 overflow-x-hidden border-t border-[#D4AF37]">
        <BackgroundGridAndCircles />
        
        <main className="max-w-[800px] mx-auto px-6 py-24 md:py-32 relative z-10 flex flex-col gap-16 md:gap-24">
          <header className="flex flex-col gap-6 md:gap-8">
            <p className="text-[#D4AF37] tracking-[0.3em] text-[10px] uppercase">
              Introducing the future of dating
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="text-7xl md:text-8xl font-serif text-white tracking-widest uppercase mb-2">
                T<span className="text-[#D4AF37]">i</span>nge
              </h1>
              <p className="text-xl md:text-2xl font-serif italic text-[#E0D8D0]/70 max-w-xl">
                Connect as You Are. Explore as Your Double.
              </p>
            </div>
            <div className="w-16 h-[1px] bg-[#D4AF37] mt-2" />
          </header>

          <section className="flex flex-col gap-8">
            <h2 className="text-4xl md:text-5xl lg:text-[54px] font-serif leading-[1.2] text-white">
              Meet people as <span className="text-[#D4AF37] italic">yourself</span> —<br className="hidden md:block" />
              or let your double <span className="text-[#D4AF37] italic">go first.</span>
            </h2>
            <p className="text-lg md:text-[20px] text-[#E0D8D0]/70 leading-[1.7] max-w-2xl font-light">
              Tinge creates your AI-powered Digital Double from your face, voice, and personality — so shy users can connect without the pressure, and everyone can date smarter.
            </p>
            <div>
               <button 
                  onClick={() => setView('onboarding')}
                  className="bg-[#D4AF37] hover:bg-[#b5952f] text-black px-10 py-5 font-medium transition-colors uppercase tracking-[0.3em] text-[10px] rounded-sm shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                >
                  Create Your Double
                </button>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-[#2A2A2A] border border-[#2A2A2A]">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-[#111] p-8 md:p-10 flex items-start gap-5 group hover:bg-[#1a1a1a] transition-colors relative overflow-hidden">
                <div className="mt-1 flex-shrink-0">{feature.icon}</div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-white font-serif text-xl tracking-wide">{feature.title}</h3>
                  <p className="text-[#E0D8D0]/60 text-[13px] leading-relaxed font-light">{feature.description}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 border-y border-[#2A2A2A] py-12 md:py-16 md:gap-0 gap-10">
            {stats.map((stat, idx) => (
              <div key={idx} className={`flex flex-col items-center justify-center text-center px-4 ${idx !== stats.length - 1 ? 'md:border-r md:border-[#2A2A2A]' : ''}`}>
                <div className="text-5xl md:text-6xl font-serif text-[#D4AF37] mb-3 md:mb-4 tracking-tight">
                  {stat.value}
                  <span className="text-[#D4AF37] text-2xl md:text-3xl align-top ml-1 opacity-90">{stat.unit}</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#E0D8D0]/50">{stat.label}</div>
              </div>
            ))}
          </section>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // Onboarding View
  // ----------------------------------------------------
  if (view === 'onboarding') {
    return <OnboardingView 
      onComplete={(profile) => {
        setUserProfile(profile);
        setView('chat');
      }}
    />;
  }

  // ----------------------------------------------------
  // Chat View
  // ----------------------------------------------------
  // Chat view fall-through (ChatDashboard will render below)

  return (
    <ChatDashboard 
      userProfile={userProfile}
      matches={matches}
      isLoadingMatches={isLoadingMatches}
      activeMatchIndex={activeMatchIndex}
      setActiveMatchIndex={setActiveMatchIndex}
      chatHistories={chatHistories}
      setChatHistories={setChatHistories}
      onRefreshMatches={() => loadMatches(userProfile)}
    />
  );
}

// ==========================================
// Onboarding Component
// ==========================================
function OnboardingView({ onComplete }: { onComplete: (profile: any) => void }) {
  const [name, setName] = useState('');
  const [traits, setTraits] = useState('');
  const [interests, setInterests] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      name: name || 'User',
      traits: traits.split(',').map(t => t.trim()).filter(Boolean),
      interests: interests.split(',').map(i => i.trim()).filter(Boolean)
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0D8D0] font-sans relative overflow-x-hidden border-t border-[#D4AF37] flex items-center justify-center">
      <BackgroundGridAndCircles />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg p-8 md:p-12 border border-[#2A2A2A] bg-[#080808] relative z-10 rounded-sm shadow-2xl"
      >
        <div className="mb-10 text-center flex flex-col items-center">
          <TargetIcon />
          <h2 className="text-3xl font-serif text-white mt-4 mb-2">Train Your Double</h2>
          <p className="text-sm text-[#E0D8D0]/60 font-light">Tell us about yourself so your AI can represent you honestly.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Name</label>
            <input 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-[#111] border border-[#2A2A2A] p-4 focus:outline-none focus:border-[#D4AF37]/50 text-white transition-colors"
              placeholder="e.g. Alex"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Personality Traits (comma separated)</label>
            <input 
              required
              value={traits}
              onChange={e => setTraits(e.target.value)}
              className="bg-[#111] border border-[#2A2A2A] p-4 focus:outline-none focus:border-[#D4AF37]/50 text-white transition-colors"
              placeholder="e.g. Introverted, Analytical, Dry humor"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Interests (comma separated)</label>
            <input 
              required
              value={interests}
              onChange={e => setInterests(e.target.value)}
              className="bg-[#111] border border-[#2A2A2A] p-4 focus:outline-none focus:border-[#D4AF37]/50 text-white transition-colors"
              placeholder="e.g. Indie films, Baking, Synthwave"
            />
          </div>

          <button 
            type="submit" 
            className="mt-4 bg-[#D4AF37] hover:bg-[#b5952f] text-black py-4 font-medium transition-colors uppercase tracking-[0.3em] text-[10px]"
          >
            Initialize Double
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ==========================================
// Chat Dashboard Component (With Full Diagnostics & Simulation Transcript)
// ==========================================
function ChatDashboard({ userProfile, matches, isLoadingMatches, activeMatchIndex, setActiveMatchIndex, chatHistories, setChatHistories, onRefreshMatches }: any) {
  const activeMatch = activeMatchIndex !== null ? matches[activeMatchIndex] : null;
  const matchProfile = activeMatch?.candidate;
  
  const history = matchProfile ? (chatHistories[matchProfile.name] || []) : [];

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  
  // State to hold comprehensive diagnostics generated by /api/simulate
  const [simulationReports, setSimulationReports] = useState<Record<string, any>>({});
  const [isSimulating, setIsSimulating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<any>(null);

  // Reset expansion state when changing match context
  useEffect(() => {
    setIsReportExpanded(false);
  }, [activeMatchIndex]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  // Setup WebSocket connection for real-time messaging
  useEffect(() => {
    if (!userProfile) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}`);
    wsRef.current = ws;
    ws.addEventListener('open', () => {
      try {
        ws.send(JSON.stringify({ type: 'identify', name: userProfile.name }));
      } catch (e) {}
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'message') {
          const payload = data.payload || data.message || {};
          const from = data.from || payload.speaker || 'Unknown';
          const msgObj = payload.speaker ? payload : { speaker: from, message: payload.message || payload, sentiment: payload.sentiment || '' };
          setChatHistories((prev: any) => {
            const conv = prev[msgObj.speaker] || [];
            return { ...prev, [msgObj.speaker]: [...conv, { speaker: msgObj.speaker, message: msgObj.message, sentiment: msgObj.sentiment || '' }] };
          });
        }
      } catch (e) {
        // ignore
      }
    });

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, [userProfile, setChatHistories]);

  // Function to call the deep simulation backend
  const handleRunSimulation = async () => {
    if (!userProfile || !matchProfile) return;
    setIsSimulating(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentA: userProfile,
          agentB: matchProfile
        })
      });
      if (response.ok) {
        const data = await response.json();
        // Save the simulation diagnostics locally under the match's name
        setSimulationReports((prev) => ({
          ...prev,
          [matchProfile.name]: data
        }));
      }
    } catch (e) {
      console.error("Simulation retrieval error:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRealSend = async () => {
    if (!inputText.trim() || !matchProfile) return;
    
    const newMsg = { speaker: userProfile.name, message: inputText, sentiment: 'Real Chat' };
    const currentHistory = [...history, newMsg];
    
    setChatHistories((prev: any) => ({ ...prev, [matchProfile.name]: currentHistory }));
    
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'outgoing_message', 
          from: userProfile.name, 
          target: matchProfile.name, 
          message: newMsg 
        }));
      }
    } catch (e) {
      console.error("WS error:", e);
    }
    
    setInputText('');

    if (!matchProfile.isReal) {
      setIsTyping(true);
      try {
        const res = await fetch('/api/generate_reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            speakerProfile: matchProfile,
            partnerProfile: userProfile,
            chatHistory: currentHistory
          })
        });
        const data = await res.json();
        if(data.message) {
          setChatHistories((prev: any) => ({
            ...prev,
            [matchProfile.name]: [...currentHistory, { speaker: matchProfile.name, message: data.message, sentiment: data.sentiment }]
          }));
        }
      } catch(e) {
        console.error(e);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleDoubleSend = async () => {
    if (!matchProfile) return;
    setIsTyping(true);
    
    try {
      const res1 = await fetch('/api/generate_reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerProfile: userProfile,
          partnerProfile: matchProfile,
          chatHistory: history
        })
      });
      const data1 = await res1.json();
      
      const newMsg = { speaker: userProfile.name, message: data1.message || "...", sentiment: data1.sentiment || "Double Chat" };
      const intermediateHistory = [...history, newMsg];
      
      setChatHistories((prev: any) => ({ ...prev, [matchProfile.name]: intermediateHistory }));

      if (!matchProfile.isReal) {
        const res2 = await fetch('/api/generate_reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            speakerProfile: matchProfile,
            partnerProfile: userProfile,
            chatHistory: intermediateHistory
          })
        });
        const data2 = await res2.json();

        if(data2.message) {
          setChatHistories((prev: any) => ({
            ...prev,
            [matchProfile.name]: [...intermediateHistory, { speaker: matchProfile.name, message: data2.message, sentiment: data2.sentiment }]
          }));
        }
      }

    } catch(e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  // Check if a report profile generated via deep simulation exists for this person
  const activeReport = matchProfile ? simulationReports[matchProfile.name] : null;

  return (
    <div className="h-screen flex bg-[#050505] text-[#E0D8D0] font-sans border-t border-[#D4AF37] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-[#2A2A2A] bg-[#080808] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h1 className="text-2xl font-serif text-white tracking-widest uppercase">T<span className="text-[#D4AF37]">i</span>nge</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mt-2">Nexus Active</p>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-4 px-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E0D8D0]/40">Your Matches</p>
            <button 
              onClick={onRefreshMatches}
              disabled={isLoadingMatches}
              className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] hover:text-white transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          {isLoadingMatches ? (
             <div className="text-xs font-mono text-[#D4AF37] px-2 animate-pulse">Running collaborative filtering...</div>
          ) : (
            <div className="flex flex-col gap-2">
              {matches.map((m: any, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setActiveMatchIndex(idx)}
                  className={`w-full text-left p-4 rounded-sm border transition-colors ${idx === activeMatchIndex ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-transparent hover:bg-[#111]'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-serif text-lg text-white">{m.candidate.name}</span>
                    <span className="text-[10px] font-mono text-[#D4AF37]">{m.compatibilityScore}% Sync</span>
                  </div>
                  <p className="text-xs text-[#E0D8D0]/50 truncate">{m.candidate.traits.join(', ')}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-[#2A2A2A] bg-[#111]">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center font-serif text-white">{userProfile?.name?.charAt(0)}</div>
             <div>
               <p className="text-sm text-white">{userProfile?.name}</p>
               <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest">Digital Double Active</p>
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
        {activeMatch ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-[#2A2A2A] flex items-center justify-between px-8 bg-[#080808]/80 backdrop-blur-md z-20 relative">
              <div>
                <h2 className="text-xl font-serif text-white">{matchProfile.name}</h2>
                <p className="text-xs text-[#E0D8D0]/50 mt-0.5">{matchProfile.interests.join(' • ')}</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Diagnostics</p>
                 <button 
                   onClick={() => setIsReportExpanded(!isReportExpanded)}
                   className="text-xs font-light text-[#E0D8D0]/70 hover:text-[#D4AF37] transition-colors mt-0.5 flex items-center gap-1 ml-auto"
                 >
                   <span>{isReportExpanded ? "Hide Reports ▲" : "View Advanced Report ▼"}</span>
                 </button>
              </div>
            </div>

            {/* Comprehensive Diagnostics Dropdown Panel */}
            <AnimatePresence initial={false}>
              {isReportExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="border-b border-[#2A2A2A] bg-[#070707] px-8 py-6 z-10 overflow-y-auto max-h-[60vh] shadow-2xl relative"
                >
                  {!activeReport ? (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <p className="text-xs text-[#E0D8D0]/50 mb-3 max-w-sm">
                        Generate a complete virtual simulation script to access red flags, emotional tone analysis, and action advice.
                      </p>
                      <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors px-5 py-2.5 text-[10px] font-mono uppercase tracking-widest disabled:opacity-40"
                      >
                        {isSimulating ? "Simulating Double Interactions..." : "⚡ Run Deep Matrix Simulation"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-light">
                      <div className="md:col-span-2 border-b border-[#2A2A2A] pb-3 flex justify-between items-end">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.25em] text-[#D4AF37] font-mono">Quantum Simulation Metrics</p>
                          <h3 className="font-serif text-xl text-white mt-1">Matrix Conclusion</h3>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xl text-[#D4AF37]">{activeReport.synchronicityScore}% Sync</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 bg-[#111] p-4 border border-[#2A2A2A] rounded-sm">
                        <p className="font-serif text-[14px] text-[#E0D8D0] italic leading-relaxed">
                          "{activeReport.conclusion}"
                        </p>
                      </div>

                      {/* Positive Indicators */}
                      <div className="bg-[#111]/40 p-4 border border-[#2A2A2A]">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 mb-2">✦ Compatibility Signals</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-[#E0D8D0]/80">
                          {activeReport.compatibilitySignals?.map((signal: string, idx: number) => (
                            <li key={idx}>{signal}</li>
                          ))}
                          {activeReport.compatibilitySignals?.length === 0 && <li>No notable signals.</li>}
                        </ul>
                      </div>

                      {/* Red Flags */}
                      <div className="bg-[#111]/40 p-4 border border-[#2A2A2A]">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-rose-400 mb-2">▲ Red Flags / Friction Areas</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-[#E0D8D0]/80">
                          {activeReport.redFlags?.map((flag: string, idx: number) => (
                            <li key={idx}>{flag}</li>
                          ))}
                          {activeReport.redFlags?.length === 0 && <li className="text-emerald-400/80">No structural red flags flagged.</li>}
                        </ul>
                      </div>

                      {/* Emotional Tone */}
                      <div className="p-4 border border-[#2A2A2A]">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] mb-1">🎭 Emotional Tone Analysis</p>
                        <p className="text-xs text-[#E0D8D0]/80 leading-relaxed">{activeReport.emotionalToneAnalysis}</p>
                      </div>

                      {/* Next Steps */}
                      <div className="p-4 border border-[#D4AF37]/30 bg-[#D4AF37]/5">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] mb-1">📡 Actionable Strategic Advice</p>
                        <p className="text-xs text-white font-medium leading-relaxed">{activeReport.suggestionsForNextStep}</p>
                      </div>

                      {/* New: Simulation Transcript Log View */}
                      <div className="md:col-span-2 border-t border-[#2A2A2A] pt-4 mt-2">
                        <p className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] mb-3">💬 Inter-Agent Simulation Transcript</p>
                        <div className="bg-[#0b0b0b] border border-[#2A2A2A] p-4 flex flex-col gap-3 rounded-sm max-h-60 overflow-y-auto custom-scrollbar">
                          {activeReport.conversation?.map((msg: any, idx: number) => {
                            const isUserAgent = msg.speaker === userProfile?.name;
                            return (
                              <div key={idx} className={`flex flex-col text-xs ${isUserAgent ? 'items-end' : 'items-start'}`}>
                                <div className="text-[9px] uppercase tracking-widest text-[#E0D8D0]/40 mb-0.5">
                                  {msg.speaker} <span className="opacity-50 mx-1">•</span> <span className="italic normal-case text-[#D4AF37]/80">{msg.sentiment}</span>
                                </div>
                                <div className={`p-3 font-serif max-w-[85%] border leading-relaxed ${isUserAgent ? 'bg-[#161616] border-[#333] text-white' : 'bg-[#121212] border-[#252525] text-[#E0D8D0]'}`}>
                                  {msg.message}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-2 text-center mt-2">
                        <button
                          onClick={handleRunSimulation}
                          disabled={isSimulating}
                          className="text-[10px] font-mono text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors uppercase tracking-wider"
                        >
                          {isSimulating ? "Re-simulating..." : "↻ Re-Run Match Simulation"}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 relative">
              <BackgroundGridAndCircles />
              {history.length === 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <DiamondSolid />
                    <p className="text-[#D4AF37] tracking-[0.2em] text-[10px] uppercase mt-4 mb-2">Nexus connection established</p>
                    <p className="font-serif text-xl text-white">Let your double break the ice, or send a real message.</p>
                 </div>
              )}
              {history.map((turn: any, i: number) => {
                const isMe = turn.speaker === userProfile.name;
                const isDouble = turn.sentiment !== 'Real Chat' && isMe;
                return (
                  <div key={i} className={`flex flex-col gap-1 z-10 max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <p className="text-[10px] uppercase tracking-widest text-[#E0D8D0]/40">
                        {turn.speaker} {isDouble && <span className="text-[#D4AF37] ml-1">(Double)</span>} 
                        <span className="opacity-50 mx-1">•</span> 
                        <span className="italic normal-case opacity-70">{turn.sentiment}</span>
                      </p>
                      <div className={`p-4 font-serif text-[15px] border leading-relaxed ${isMe ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-[#111] border-[#2A2A2A] text-[#E0D8D0]'}`}>
                        {turn.message}
                      </div>
                  </div>
                );
              })}
              {isTyping && (
                 <div className="flex items-center gap-4 text-[#D4AF37] font-mono text-[10px] uppercase tracking-widest p-4 border border-[#2A2A2A] bg-[#111] self-start z-10">
                   <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                   Agent is formulating response...
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-[#2A2A2A] bg-[#080808] z-10">
              <div className="flex gap-4">
                <input 
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRealSend()}
                  placeholder="Type a real message..."
                  className="flex-1 bg-[#111] border border-[#2A2A2A] px-6 py-4 focus:outline-none focus:border-[#D4AF37]/50 text-white transition-colors"
                  disabled={isTyping}
                />
                <button 
                  onClick={handleRealSend}
                  disabled={isTyping || !inputText.trim()}
                  className="px-8 border border-[#2A2A2A] hover:bg-[#1a1a1a] text-white transition-colors uppercase tracking-[0.2em] text-[10px] font-medium disabled:opacity-50"
                >
                  Send
                </button>
                <button 
                  onClick={handleDoubleSend}
                  disabled={isTyping}
                  className="px-8 bg-[#D4AF37] hover:bg-[#b5952f] text-black transition-colors uppercase tracking-[0.2em] text-[10px] font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <DiamondSolid />
                  Let Double Reply
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {isLoadingMatches ? (
              <p className="text-[#D4AF37] font-mono text-[10px] uppercase tracking-widest animate-pulse">Processing Candidates...</p>
            ) : (
              <p className="text-[#E0D8D0]/40 font-mono text-[10px] uppercase tracking-widest">Select a match to begin</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}