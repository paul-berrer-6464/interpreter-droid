import { useState, useRef } from 'react';

const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Italian', code: 'it' },
  { name: 'Greek', code: 'el' },
  { name: 'Latin', code: 'la' }
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

    const res = await fetch('http://localhost:5000/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    setInputText(data.text); // Put transcribed text into the box
  };

  // --- Translation Logic ---
  const handleTranslate = async () => {
    const res = await fetch('http://localhost:5000/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText, source: sourceLang, target: targetLang, voiceOut: useVoiceOut })
    });
    const data = await res.json();
    setTranslatedText(data.translatedText);
    
    // Inside handleTranslate in App.tsx
  if (useVoiceOut && data.audioUrl) {
    // Adding ?t= + timestamp forces the browser to bypass the cache
    const audio = new Audio(`http://localhost:5000${data.audioUrl}?t=${Date.now()}`);
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
          <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Translation:</p>
          <p className="text-lg text-gray-800">{translatedText || "Waiting for input..."}</p>
        </div>
      </div>
    </div>
  );
}