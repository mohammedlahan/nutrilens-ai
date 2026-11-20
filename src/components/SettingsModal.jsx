import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Utensils, Check, ExternalLink, Trash2, Sparkles } from 'lucide-react';
import {
  getGoogleApiKey,
  saveGoogleApiKey,
  getOpenAIApiKey,
  saveOpenAIApiKey,
  getActiveProvider,
  saveActiveProvider
} from '../services/nutriLensService';

export default function SettingsModal({
  isOpen,
  onClose,
  dietGoal,
  setDietGoal,
  onClearHistory
}) {
  const [googleKey, setGoogleKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [activeProvider, setActiveProvider] = useState('nvidia');
  const [isSaved, setIsSaved] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [nvidiaConfigured, setNvidiaConfigured] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGoogleKey(getGoogleApiKey());
      setOpenAIKey(getOpenAIApiKey());
      setActiveProvider(getActiveProvider());
      checkBackend();
    }
  }, [isOpen]);

  const checkBackend = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        setBackendStatus('online');
        setNvidiaConfigured(Boolean(data.nvidia_configured));
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  };

  const handleSave = () => {
    saveGoogleApiKey(googleKey);
    saveOpenAIApiKey(openAIKey);
    saveActiveProvider(activeProvider);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-modal-overlay" onClick={onClose}>
      <div className="gemini-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="gemini-modal-header">
          <div className="gemini-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--gemini-emerald)" /> NutriLens AI & LLM Settings
          </div>
          <button className="gemini-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* LLM Provider Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gemini-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={15} color="var(--gemini-cyan)" /> Preferred Recipe & Vision LLM Provider
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              onClick={() => setActiveProvider('nvidia')}
              style={{
                background: activeProvider === 'nvidia' ? 'var(--gemini-surface-hover)' : '#131314',
                border: `1.5px solid ${activeProvider === 'nvidia' ? '#76b900' : 'var(--gemini-border-subtle)'}`,
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                color: activeProvider === 'nvidia' ? '#fff' : 'var(--gemini-text-secondary)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: activeProvider === 'nvidia' ? '#76b900' : '#fff' }}>
                  NVIDIA
                </span>
                <span style={{ fontSize: '9px', background: 'rgba(118, 185, 0, 0.2)', color: '#76b900', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                  NIM
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--gemini-text-muted)' }}>
                Nemotron 3.5 Super VL
              </span>
            </button>

            <button
              onClick={() => setActiveProvider('google')}
              style={{
                background: activeProvider === 'google' ? 'var(--gemini-surface-hover)' : '#131314',
                border: `1.5px solid ${activeProvider === 'google' ? 'var(--gemini-emerald)' : 'var(--gemini-border-subtle)'}`,
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                color: activeProvider === 'google' ? '#fff' : 'var(--gemini-text-secondary)',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: activeProvider === 'google' ? 'var(--gemini-emerald)' : '#fff' }}>
                Google AI Studio
              </span>
              <span style={{ fontSize: '10px', color: 'var(--gemini-text-muted)' }}>
                Gemini 2.5 Flash
              </span>
            </button>

            <button
              onClick={() => setActiveProvider('openai')}
              style={{
                background: activeProvider === 'openai' ? 'var(--gemini-surface-hover)' : '#131314',
                border: `1.5px solid ${activeProvider === 'openai' ? 'var(--gemini-emerald)' : 'var(--gemini-border-subtle)'}`,
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                color: activeProvider === 'openai' ? '#fff' : 'var(--gemini-text-secondary)',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: activeProvider === 'openai' ? 'var(--gemini-emerald)' : '#fff' }}>
                OpenAI ChatGPT
              </span>
              <span style={{ fontSize: '10px', color: 'var(--gemini-text-muted)' }}>
                GPT-4o / mini
              </span>
            </button>
          </div>
        </div>

        {/* NVIDIA Nemotron Backend Status Banner */}
        {activeProvider === 'nvidia' && (
          <div style={{
            background: 'rgba(118, 185, 0, 0.08)',
            border: '1px solid rgba(118, 185, 0, 0.3)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#76b900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> NVIDIA Nemotron 3.5 Super VL 120B-A12B
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '8px',
                background: nvidiaConfigured ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: nvidiaConfigured ? '#34d399' : '#f87171'
              }}>
                {nvidiaConfigured ? '✓ NVIDIA_API_KEY Active (.env)' : (backendStatus === 'online' ? 'NVIDIA Key Missing in .env' : 'Backend Connecting...')}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--gemini-text-secondary)', lineHeight: 1.4 }}>
              Integrated via official NVIDIA NIM API (<code>https://integrate.api.nvidia.com/v1</code>).
              Model: <code>nvidia/nemotron-3.5-super-vl-120b-a12b</code>. Your API key is stored strictly on the server in <code>.env</code> and is never transmitted to the browser.
            </p>
          </div>
        )}

        {/* Google AI Studio API Key Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gemini-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} color="var(--gemini-emerald)" /> Google AI Studio API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '11px', color: 'var(--gemini-cyan)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
            >
              Get free key <ExternalLink size={10} />
            </a>
          </div>
          <input
            type="password"
            value={googleKey}
            onChange={e => setGoogleKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{
              background: '#131314',
              border: '1px solid var(--gemini-border)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* OpenAI API Key Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gemini-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} color="var(--gemini-cyan)" /> OpenAI ChatGPT API Key
            </label>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '11px', color: 'var(--gemini-cyan)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
            >
              Get API key <ExternalLink size={10} />
            </a>
          </div>
          <input
            type="password"
            value={openAIKey}
            onChange={e => setOpenAIKey(e.target.value)}
            placeholder="sk-proj-..."
            style={{
              background: '#131314',
              border: '1px solid var(--gemini-border)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Dietary Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gemini-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Utensils size={15} color="var(--gemini-amber)" /> Dietary Nutrition Goal
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['Balanced', 'High Protein', 'Keto / Low Carb', 'Vegan', 'Indian Homestyle', 'Mediterranean'].map(d => (
              <button
                key={d}
                onClick={() => setDietGoal(d)}
                style={{
                  background: dietGoal === d ? 'rgba(16, 185, 129, 0.18)' : '#131314',
                  border: `1px solid ${dietGoal === d ? 'var(--gemini-emerald)' : 'var(--gemini-border-subtle)'}`,
                  color: dietGoal === d ? '#34d399' : 'var(--gemini-text-secondary)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Save & Clear */}
        <div style={{
          borderTop: '1px solid var(--gemini-border-subtle)',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={onClearHistory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--gemini-rose)',
              background: 'transparent',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={13} /> Clear Chats
          </button>

          <button
            onClick={handleSave}
            style={{
              background: isSaved ? 'var(--gemini-emerald)' : '#34d399',
              color: '#081c15',
              padding: '8px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            {isSaved ? <><Check size={14} /> Keys Saved</> : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
