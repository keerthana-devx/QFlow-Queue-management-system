import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Volume2, VolumeX, RefreshCw, Mic } from 'lucide-react';
import { getPublicQueue } from '../services/api';
import Logo from '../components/Logo';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ── Voice announcement helper ─────────────────────────────────────────────────
function buildAnnouncement(appt) {
  const token = appt.tokenCode.split('-').join(' ');   // "GEN 001" → spoken naturally
  const dept  = appt.department || 'the service area';
  const doc   = appt.doctor?.name ? `Dr. ${appt.doctor.name}` : null;

  if (doc) return `Token ${token}, please proceed to ${doc} in ${dept}.`;
  return `Token ${token}, please proceed to ${dept}.`;
}

function speak(text, voiceEnabled) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate   = 0.88;
  utt.pitch  = 1;
  utt.volume = 1;
  // Prefer a clear English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
  ) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ── Clock component ───────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-3xl font-bold text-white tabular-nums">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-green-300 text-sm">
        {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LiveDisplay() {
  const { managerId }           = useParams();
  const [queueData, setQueueData] = useState({ current: [], waiting: [], recent: [], waitingCount: 0 });
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceReady, setVoiceReady]     = useState(false);
  const [connected, setConnected]       = useState(false);
  const [flash, setFlash]               = useState(false);
  const [lastAnnounced, setLastAnnounced] = useState('');
  const [announcement, setAnnouncement]   = useState('');
  const announcementRef = useRef('');

  const loadQueue = useCallback(async () => {
    try {
      const r = await getPublicQueue(managerId);
      setQueueData(r.data);
    } catch { /* silent */ }
  }, [managerId]);

  // Initial load
  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Socket.IO — public room, no auth token
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      query: { managerId },
      reconnectionAttempts: 20,
      reconnectionDelay: 3000,
    });

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const handleCalled = (appt) => {
      loadQueue();
      // Flash the screen
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);

      // Build and store announcement text
      const text = buildAnnouncement(appt);
      announcementRef.current = text;
      setAnnouncement(text);

      // Only announce if this is a new call event (not a reconnect replay)
      if (text !== lastAnnounced) {
        setLastAnnounced(text);
        speak(text, voiceEnabled);
      }
    };

    socket.on('appointment:called',    handleCalled);
    socket.on('appointment:new',       loadQueue);
    socket.on('appointment:serving',   loadQueue);
    socket.on('appointment:completed', loadQueue);
    socket.on('appointment:cancelled', loadQueue);

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerId, voiceEnabled]);

  const enableVoice = () => {
    // Browsers require a user gesture before allowing speech
    window.speechSynthesis?.getVoices(); // warm up voice list
    setVoiceEnabled(true);
    setVoiceReady(true);
    // Test announcement
    speak('Voice announcements enabled. QFlow is ready.', true);
  };

  const replayAnnouncement = () => {
    if (announcementRef.current) speak(announcementRef.current, true);
  };

  const current = queueData.current?.[0] || null;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${flash ? 'bg-[#1b4332]' : 'bg-[#0d2818]'}`}>

      {/* Header bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Logo variant="compact" size="md" />
        <Clock />
      </header>

      {/* Connection + voice controls */}
      <div className="flex items-center justify-between px-8 py-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-green-400">{connected ? 'Live' : 'Reconnecting…'}</span>
        </div>
        <div className="flex items-center gap-3">
          {!voiceReady ? (
            <button
              onClick={enableVoice}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#2d6a4f] text-white text-xs font-semibold rounded-lg hover:bg-[#40916c] transition-colors"
            >
              <Mic size={13} /> Enable Announcements
            </button>
          ) : (
            <>
              <button
                onClick={() => setVoiceEnabled(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors"
              >
                {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {voiceEnabled ? 'Voice On' : 'Voice Off'}
              </button>
              {announcement && (
                <button
                  onClick={replayAnnouncement}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors"
                >
                  <RefreshCw size={13} /> Replay
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid md:grid-cols-3 gap-0 p-6 gap-6">

        {/* LEFT — Now Serving (large) */}
        <div className="md:col-span-2 flex flex-col">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-4">Now Serving</p>

          {current ? (
            <div className={`flex-1 flex flex-col items-center justify-center rounded-3xl border-2 p-8 transition-all duration-500 ${
              flash ? 'border-white bg-white/10' : 'border-[#2d6a4f] bg-[#1a3d2b]'
            }`}>
              <div className="text-center">
                <p className="text-9xl font-black text-white tracking-tight mb-4 leading-none">
                  {current.tokenCode}
                </p>
                {current.doctor && (
                  <p className="text-2xl text-green-300 font-semibold mb-2">
                    Dr. {current.doctor.name}
                  </p>
                )}
                <p className="text-green-400 text-lg">{current.department}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-3xl border-2 border-[#2d6a4f]/40 bg-[#1a3d2b]/40">
              <div className="text-center">
                <p className="text-6xl font-black text-white/20 mb-3">—</p>
                <p className="text-green-600 text-sm">No patient currently being served</p>
              </div>
            </div>
          )}

          {/* Announcement banner */}
          {announcement && (
            <div className="mt-4 bg-[#2d6a4f]/60 border border-[#40916c] rounded-2xl px-5 py-3">
              <p className="text-green-200 text-sm text-center">{announcement}</p>
            </div>
          )}
        </div>

        {/* RIGHT — Waiting + Recent */}
        <div className="flex flex-col gap-4">
          {/* Waiting count */}
          <div className="bg-[#1a3d2b] rounded-2xl p-4 border border-[#2d6a4f]/40 text-center">
            <p className="text-4xl font-bold text-white">{queueData.waitingCount}</p>
            <p className="text-green-400 text-xs uppercase tracking-wider mt-1">Patients Waiting</p>
          </div>

          {/* Next up */}
          <div className="bg-[#1a3d2b] rounded-2xl p-4 border border-[#2d6a4f]/40 flex-1">
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-3">Next Up</p>
            {queueData.waiting?.length === 0 ? (
              <p className="text-green-700 text-sm text-center py-4">Queue is empty</p>
            ) : (
              <div className="flex flex-col gap-2">
                {queueData.waiting.slice(0, 5).map((a, i) => (
                  <div
                    key={a._id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${
                      i === 0 ? 'bg-[#2d6a4f]/60 border border-[#40916c]' : 'bg-white/5'
                    }`}
                  >
                    <span className={`font-bold text-lg ${i === 0 ? 'text-white' : 'text-green-400'}`}>
                      {a.tokenCode}
                    </span>
                    <span className="text-green-600 text-xs">{a.department?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently completed */}
          {queueData.recent?.length > 0 && (
            <div className="bg-[#1a3d2b] rounded-2xl p-4 border border-[#2d6a4f]/40">
              <p className="text-green-600 text-xs font-semibold uppercase tracking-wider mb-3">Recently Completed</p>
              <div className="flex flex-col gap-1.5">
                {queueData.recent.map(a => (
                  <div key={a._id} className="flex items-center justify-between">
                    <span className="text-green-700 text-sm font-medium">{a.tokenCode}</span>
                    <span className="text-green-800 text-xs">{a.department?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-green-800 text-xs py-3">
        QFlow — Smart Queue Management · Public Display
      </footer>
    </div>
  );
}
