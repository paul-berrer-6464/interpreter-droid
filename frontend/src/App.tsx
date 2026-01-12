import { useState, useRef } from 'react';

const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Italian', code: 'it' },
  { name: 'Greek', code: 'el' },
  { name: 'Latin', code: 'la' }
];

const VOICES = [
  { name: 'Default', code: 'default' },
  { name: 'English Male', code: 'en-US-Standard-B' },
  { name: 'English Female', code: 'en-US-Standard-C' },
  { name: 'Italian Male', code: 'it-IT-Standard-D' },
  { name: 'Italian Female', code: 'it-IT-Standard-A' },
];

const SPEEDS = [
  { name: 'Slow', value: 0.75 },
  { name: 'Normal', value: 1.0 },
  { name: 'Fast', value: 1.25 },
];


export default function App() {
  // State
  const [sourceLang, setSourceLang] = useState('it');
  const [targetLang, setTargetLang] = useState('el');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [useVoiceIn, setUseVoiceIn] = useState(false);
  const [useVoiceOut, setUseVoiceOut] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].code);
  const [playbackSpeed, setPlaybackSpeed] = useState(SPEEDS[1].value);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);


  // Audio Recording Refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // --- Voice In Logic ---
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      sendAudioToBackend(audioBlob);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const sendAudioToBackend = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob);
    formData.append('lang', sourceLang);

    const res = await fetch('https://interpreter-droid-120472993668.us-east4.run.app/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    setInputText(data.text); // Put transcribed text into the box
  };

  // --- Translation Logic ---
  const handleTranslate = async () => {
    const res = await fetch('https://interpreter-droid-120472993668.us-east4.run.app/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: inputText, 
        source: sourceLang, 
        target: targetLang, 
        voiceOut: useVoiceOut,
        voice: selectedVoice,
        speed: playbackSpeed
      })
    });
    const data = await res.json();
    setTranslatedText(data.translatedText);
    
    // Inside handleTranslate in App.tsx
    if (useVoiceOut && data.audioUrl) {
      const url = `https://interpreter-droid-120472993668.us-east4.run.app${data.audioUrl}?t=${Date.now()}`;
      setAudioUrl(url);
      const audio = new Audio(url);
      audio.play();
    }
  };

  const handlePlayAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Interpreter Droid</h1>

        {/* Language Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold mb-1">From:</label>
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="w-full border p-2 rounded">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">To:</label>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full border p-2 rounded">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex gap-4 mb-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useVoiceIn} onChange={() => setUseVoiceIn(!useVoiceIn)} /> Voice Input
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useVoiceOut} onChange={() => setUseVoiceOut(!useVoiceOut)} /> Voice Output
          </label>
        </div>

        {/* Voice and Speed Controls */}
        {useVoiceOut && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold mb-1">Voice:</label>
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full border p-2 rounded">
                {VOICES.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Speed:</label>
              <div className="flex rounded-md border border-gray-300">
                {SPEEDS.map((s, idx) => (
                    <button 
                        key={s.name}
                        onClick={() => setPlaybackSpeed(s.value)}
                        className={`w-full p-2 text-sm transition-colors
                          ${playbackSpeed === s.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}
                          ${idx === 0 ? 'rounded-l-md' : ''}
                          ${idx === SPEEDS.length - 1 ? 'rounded-r-md' : ''}
                          ${idx !== SPEEDS.length - 1 ? 'border-r border-gray-300' : ''}
                        `}
                    >
                        {s.name}
                    </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="mb-4">
          <textarea 
            className="w-full border p-3 rounded-lg h-32 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Type or speak something..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {useVoiceIn && (
            <button 
              onMouseDown={startRecording} onMouseUp={stopRecording}
              className={`mt-2 w-full p-3 rounded-lg font-bold text-white transition ${isRecording ? 'bg-red-500 scale-95' : 'bg-blue-500'}`}
            >
              {isRecording ? 'Listening... (Release to finish)' : 'Hold to Speak'}
            </button>
          )}
        </div>

        <button onClick={handleTranslate} className="w-full bg-green-500 text-white font-bold p-3 rounded-lg mb-6 hover:bg-green-600">
          Translate
        </button>

        {/* Output Section */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Translation:</p>
            {audioUrl && useVoiceOut && (
              <button onClick={handlePlayAudio} className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold hover:bg-blue-600 transition shadow">
                &#9658; Play
              </button>
            )}
          </div>
          <p className="text-lg text-gray-800">{translatedText || "Waiting for input..."}</p>
        </div>
      </div>
    </div>
  );
}
