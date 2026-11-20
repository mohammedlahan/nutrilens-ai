import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Mic,
  ArrowUp,
  SquarePen,
  Clock,
  Settings,
  X,
  ChevronDown,
  Copy,
  Check,
  Volume2,
  Sparkles,
  Flame,
  UtensilsCrossed,
  ChefHat,
  Camera,
  Key,
  Menu,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import NutriLensLogo from './components/NutriLensLogo';
import SettingsModal from './components/SettingsModal';
import CameraScannerModal from './components/CameraScannerModal';
import {
  analyzeFoodWithAI,
  sendChatFollowUp,
  getGoogleApiKey,
  getOpenAIApiKey,
  getActiveProvider,
  saveFoodCorrection,
  fetchMoreSimpleRecipes
} from './services/nutriLensService';

export default function App() {
  // Navigation & Rail States
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeMode, setActiveMode] = useState('chat'); // 'chat' or 'scan'

  // Model & Dietary Settings
  const [activeProvider, setActiveProvider] = useState(getActiveProvider());
  const [dietGoal, setDietGoal] = useState('Balanced');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Chat Sessions & Active Chat
  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('nutrilens_chat_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  // Capsule Input States
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null); // { base64, name }
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // UI Interactive States
  const [copiedId, setCopiedId] = useState(null);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [loadingMoreId, setLoadingMoreId] = useState(null);
  const [confirmedBasket, setConfirmedBasket] = useState([]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const hiddenGalleryInputRef = useRef(null);

  // Check if API key is present
  const hasApiKey = Boolean(activeProvider === 'nvidia' || getGoogleApiKey() || getOpenAIApiKey());

  // Save chat sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nutrilens_chat_sessions', JSON.stringify(chatSessions));
    } catch (e) {
      console.warn('Failed to save sessions:', e);
    }
  }, [chatSessions]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Start fresh conversation
  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setAttachedImage(null);
    setInputText('');
    setIsMobileNavOpen(false);
  };

  // Load existing session
  const handleSelectSession = (session) => {
    setCurrentChatId(session.id);
    setMessages(session.messages || []);
    setAttachedImage(null);
    setInputText('');
    setIsMobileNavOpen(false);
  };

  // Voice Speech Recognition
  const toggleVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // User selects correction from low confidence top-3 options
  const handleUserPickCorrection = async (msgId, candidate, imageRaw) => {
    const chosenClass = candidate.class || candidate.label;
    const chosenLabel = candidate.label || candidate.class;

    if (imageRaw) {
      try {
        await saveFoodCorrection(imageRaw, chosenClass);
      } catch (e) {
        console.warn('Could not save correction:', e);
      }
    }

    const newBasket = [...new Set([...confirmedBasket, chosenLabel.toLowerCase()])];
    setConfirmedBasket(newBasket);
    showToast(`Confirmed as ${chosenLabel}! Finding simple ideas...`);

    let newIdeas = [];
    try {
      newIdeas = await fetchMoreSimpleRecipes({
        items: newBasket,
        preference: dietGoal !== 'Balanced' ? dietGoal : null,
        n: 3
      });
    } catch (e) {
      console.warn('Could not fetch simple recipes on confirmation:', e);
    }

    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;

      return {
        ...m,
        food_name: chosenLabel.charAt(0).toUpperCase() + chosenLabel.slice(1),
        category: `${candidate.category || 'Produce'} (User Confirmed)`,
        confidence: 'Confirmed (100%)',
        needs_confirmation: false,
        summary: `Confirmed food: ${newBasket.join(' + ')}. Here are simple everyday ideas:`,
        confirmed_items: newBasket,
        simple_recipes: newIdeas.length > 0 ? newIdeas : (m.simple_recipes || []),
        recipe: newIdeas[0] || m.recipe
      };
    }));
  };

  // Direct Gallery Upload
  const handleGalleryUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImage({
            base64: event.target.result,
            name: file.name || 'Uploaded Food Photo'
          });
          showToast(`Attached ${file.name || 'food photo'}. Ready to scan!`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Prompt & Image to NutriLens AI
  const handleSendMessage = async (promptOverride = null, imageOverride = null) => {
    const textToSend = promptOverride !== null ? promptOverride : inputText.trim();
    const imageToSend = imageOverride !== null ? imageOverride : attachedImage;

    if (!textToSend && !imageToSend) return;
    if (isLoading) return;

    setInputText('');
    setAttachedImage(null);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      image: imageToSend?.base64 || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const prevAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.recipe);
      const activeRecipeContext = prevAssistantMsg?.recipe || null;

      let assistantResponse;

      if (imageToSend?.base64 || !activeRecipeContext) {
        // Real-life food vision recognition & USDA recipe generation
        assistantResponse = await analyzeFoodWithAI({
          imageBase64: imageToSend?.base64 || null,
          prompt: textToSend,
          provider: activeProvider,
          dietGoal: dietGoal
        });
      } else {
        // Multi-turn conversational chef follow-up
        const followUpReply = await sendChatFollowUp({
          history: newMessages,
          message: textToSend,
          activeRecipe: activeRecipeContext
        });

        assistantResponse = {
          food_name: activeRecipeContext.title || 'NutriLens Consultation',
          category: 'Culinary Guidance',
          summary: followUpReply,
          nutrition: activeRecipeContext.nutrition || null,
          recipe: null
        };
      }

      if (assistantResponse.food_name) {
        setConfirmedBasket([assistantResponse.food_name.toLowerCase()]);
      }
      const rawRecipes = (assistantResponse.simple_recipes && assistantResponse.simple_recipes.length > 0)
        ? assistantResponse.simple_recipes
        : (assistantResponse.recipe ? [assistantResponse.recipe] : []);

      const assistantMsg = {
        id: `nutrilens-${Date.now()}`,
        role: 'assistant',
        food_name: assistantResponse.food_name,
        category: assistantResponse.category,
        confidence: assistantResponse.confidence,
        needs_confirmation: Boolean(assistantResponse.needs_confirmation),
        top_3: assistantResponse.top_3 || [],
        image_raw: imageToSend?.base64 || null,
        summary: assistantResponse.summary,
        nutrition: assistantResponse.nutrition,
        reasoning: assistantResponse.reasoning || null,
        isError: false,
        confirmed_items: assistantResponse.food_name ? [assistantResponse.food_name.toLowerCase()] : [],
        simple_recipes: rawRecipes,
        recipe: rawRecipes[0] || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      const title = assistantResponse.recipe?.title || assistantResponse.food_name || textToSend.slice(0, 28);
      const chatId = currentChatId || `chat-${Date.now()}`;
      setCurrentChatId(chatId);

      setChatSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === chatId);
        const updatedSession = {
          id: chatId,
          title: title,
          date: new Date().toLocaleDateString(),
          messages: finalMessages
        };

        if (existingIdx >= 0) {
          const clone = [...prev];
          clone[existingIdx] = updatedSession;
          return clone;
        } else {
          return [updatedSession, ...prev];
        }
      });
    } catch (err) {
      console.error('Recognition error:', err);
      let errorSummary = err.message || 'Unable to process food recognition.';
      if (errorSummary.includes('Failed to fetch') || errorSummary.includes('NetworkError') || errorSummary.includes('connection refused')) {
        errorSummary = 'Cannot connect to backend server at http://localhost:5000. Please start the backend with: python backend/app.py';
      }
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        summary: errorSummary,
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show More Ideas (Requirement 5)
  const handleShowMoreIdeas = async (msgId) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    setLoadingMoreId(msgId);
    try {
      const existingIdeas = msg.simple_recipes || (msg.recipe ? [msg.recipe] : []);
      const excludeNames = existingIdeas.map(i => i.name || i.title);
      const items = (msg.confirmed_items && msg.confirmed_items.length > 0)
        ? msg.confirmed_items
        : (msg.food_name ? [msg.food_name] : ['apple']);

      const more = await fetchMoreSimpleRecipes({
        items,
        preference: dietGoal !== 'Balanced' ? dietGoal : null,
        excludeNames,
        n: 3
      });

      if (more && more.length > 0) {
        setMessages(prev => prev.map(m => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            simple_recipes: [...(m.simple_recipes || (m.recipe ? [m.recipe] : [])), ...more]
          };
        }));
        showToast(`Added ${more.length} more quick ideas!`);
      } else {
        showToast('No more new ideas available right now.');
      }
    } catch (e) {
      console.warn('Could not load more ideas:', e);
      showToast('Could not load more ideas.');
    } finally {
      setLoadingMoreId(null);
    }
  };

  // Copy Recipe Markdown
  const handleCopyRecipe = (recipe, msgId) => {
    if (!recipe) return;
    const markdown = `# ${recipe.title}
${recipe.description}

**Prep Time:** ${recipe.prep_time} | **Cook Time:** ${recipe.cook_time} | **Servings:** ${recipe.servings}

## Ingredients:
${recipe.ingredients.map(i => `- ${i.amount} ${i.name} (${i.prep})`).join('\n')}

## Instructions:
${recipe.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

**Chef's Tip:** ${recipe.chef_tips || 'Enjoy fresh and healthy!'}`;

    navigator.clipboard.writeText(markdown);
    setCopiedId(msgId);
    showToast('Recipe copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Text to Speech
  const handleReadAloud = (text) => {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    showToast('Reading recipe aloud...');
  };

  // Toggle Ingredient Checkbox
  const toggleIngredient = (msgId, ingIndex) => {
    const key = `${msgId}-${ingIndex}`;
    setCheckedIngredients(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearChatHistory = () => {
    setChatSessions([]);
    localStorage.removeItem('nutrilens_chat_sessions');
    handleNewChat();
    setIsSettingsOpen(false);
    showToast('All chat history cleared');
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="gemini-app-layout">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--gemini-surface-hover)',
          border: '1px solid var(--gemini-border)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={14} color="var(--gemini-emerald)" /> {toastMessage}
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div className="gemini-mobile-backdrop" onClick={() => setIsMobileNavOpen(false)} />
      )}

      {/* Slim Rail Navigation (Desktop & Mobile Drawer) */}
      <nav className={`gemini-rail ${isRailExpanded ? 'expanded' : ''} ${isMobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="gemini-rail-top">
          {/* NutriLens Brand Logo */}
          <button
            className="gemini-star-logo"
            onClick={handleNewChat}
            title="NutriLens AI - New Food Session"
          >
            <NutriLensLogo size={28} className="gemini-star-svg" />
          </button>

          {/* New Chat Button */}
          <button
            className="gemini-rail-btn"
            onClick={handleNewChat}
            title="New Food Session"
          >
            <SquarePen size={20} />
            <span className="gemini-rail-btn-label">New session</span>
          </button>

          {/* Live Camera Scanner Trigger */}
          <button
            className="gemini-rail-btn"
            onClick={() => {
              setIsCameraModalOpen(true);
              setIsMobileNavOpen(false);
            }}
            title="Open Live Camera Scanner"
          >
            <Camera size={20} color="var(--gemini-emerald)" />
            <span className="gemini-rail-btn-label">Live Camera Scan</span>
          </button>

          {/* Recent Recipes Drawer */}
          <button
            className={`gemini-rail-btn ${isRailExpanded ? 'active' : ''}`}
            onClick={() => setIsRailExpanded(!isRailExpanded)}
            title="Recent Food Sessions"
          >
            <Clock size={20} />
            <span className="gemini-rail-btn-label">Recent recipes</span>
          </button>

          {/* History List */}
          <div className="gemini-recents-list">
            {chatSessions.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--gemini-text-muted)', padding: '10px 14px' }}>
                No recent recipe sessions
              </div>
            ) : (
              chatSessions.map(session => (
                <div
                  key={session.id}
                  className={`gemini-recent-item ${currentChatId === session.id ? 'active' : ''}`}
                  onClick={() => handleSelectSession(session)}
                  title={session.title}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rail Bottom: Settings & User Profile */}
        <div className="gemini-rail-bottom">
          <button
            className="gemini-rail-btn"
            onClick={() => {
              setIsSettingsOpen(true);
              setIsMobileNavOpen(false);
            }}
            title="NutriLens Settings & API Key"
          >
            <Settings size={20} />
            <span className="gemini-rail-btn-label">Settings & Keys</span>
          </button>

          {/* User Profile Avatar with 'M' */}
          <div
            className="gemini-user-avatar"
            title="Mohamed (Account)"
            onClick={() => {
              setIsSettingsOpen(true);
              setIsMobileNavOpen(false);
            }}
          >
            M
          </div>
        </div>
      </nav>

      {/* Main App Container */}
      <main className="gemini-main">
        {/* Ambient Emerald/Teal Glow */}
        <div className="gemini-ambient-glow" style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.16) 0%, rgba(19, 19, 20, 0) 70%)'
        }} />

        {/* Top Header */}
        <header className="gemini-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mobile Hamburger Toggle */}
            <button
              className="mobile-nav-toggle"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              title="Open Navigation"
            >
              <Menu size={22} />
            </button>

            <div className="gemini-brand-title">
              <span style={{ fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>NutriLens AI</span>
              <span style={{
                fontSize: '11px',
                background: activeProvider === 'nvidia' ? 'rgba(118, 185, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${activeProvider === 'nvidia' ? 'rgba(118, 185, 0, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                padding: '2px 8px',
                borderRadius: '10px',
                color: activeProvider === 'nvidia' ? '#76b900' : '#34d399',
                fontWeight: 600
              }}>
                {activeProvider === 'nvidia' ? 'Nemotron 3.5 Super VL' : (activeProvider === 'openai' ? 'ChatGPT 4o' : 'Gemini Vision')}
              </span>
            </div>
          </div>

          <div className="gemini-top-actions">
            {!hasApiKey && (
              <button
                className="gemini-get-app-btn"
                onClick={() => setIsSettingsOpen(true)}
                style={{ borderColor: 'var(--gemini-amber)', color: '#fef3c7' }}
              >
                <Key size={13} color="var(--gemini-amber)" /> Set API Key
              </button>
            )}

            <button
              className="gemini-get-app-btn"
              onClick={() => setIsCameraModalOpen(true)}
            >
              <Camera size={14} color="var(--gemini-emerald)" /> Live Camera
            </button>

            <button
              className="gemini-capsule-icon-btn"
              onClick={handleNewChat}
              title="New Session"
            >
              <Sparkles size={18} color="var(--gemini-emerald)" />
            </button>
          </div>
        </header>

        {/* MAIN BODY: Landing vs Active Conversation */}
        {!hasMessages ? (
          /* Landing Screen */
          <div className="gemini-hero-container">
            <h1 className="gemini-hero-heading">Where should we start?</h1>

            <div className="gemini-capsule-wrapper">
              <div className="gemini-capsule">
                {/* Attached Image Thumbnail */}
                {attachedImage && (
                  <div className="gemini-capsule-attachment">
                    <img src={attachedImage.base64} alt="Attached food" />
                    <div className="gemini-capsule-attachment-info">
                      <span className="gemini-capsule-attachment-title">{attachedImage.name || 'Food Photo'}</span>
                      <span className="gemini-capsule-attachment-desc">Ready for NutriLens AI scan</span>
                    </div>
                    <button
                      className="gemini-capsule-attachment-remove"
                      onClick={() => setAttachedImage(null)}
                      title="Remove attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Input Row */}
                <div className="gemini-capsule-row">
                  {/* Plus Button -> Opens Live Camera Scanner or Gallery */}
                  <button
                    className="gemini-capsule-plus-btn"
                    onClick={() => setIsCameraModalOpen(true)}
                    title="Scan Food with Live Camera"
                  >
                    <Camera size={20} color="var(--gemini-emerald)" />
                  </button>

                  {/* Hidden File Input for Gallery Pick */}
                  <input
                    type="file"
                    ref={hiddenGalleryInputRef}
                    onChange={handleGalleryUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  {/* Text Input */}
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask NutriLens Chef (or tap camera to scan)..."
                    className="gemini-capsule-input"
                  />

                  {/* Actions inside Capsule */}
                  <div className="gemini-capsule-actions">
                    {/* Gallery upload quick button */}
                    <button
                      className="gemini-capsule-icon-btn"
                      onClick={() => hiddenGalleryInputRef.current?.click()}
                      title="Upload from Device Gallery"
                    >
                      <ImageIcon size={18} />
                    </button>

                    {/* Microphone Voice Button */}
                    <button
                      className={`gemini-capsule-icon-btn ${isRecording ? 'recording' : ''}`}
                      onClick={toggleVoiceRecording}
                      title="Voice input"
                    >
                      <Mic size={18} />
                    </button>

                    {/* Submit Button */}
                    {(inputText.trim() || attachedImage) && (
                      <button
                        className="gemini-capsule-submit-btn ready"
                        onClick={() => handleSendMessage()}
                        title="Scan & Analyze Food"
                        style={{ background: 'var(--gemini-emerald)', color: '#062b1e' }}
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mode Pills: Recipe Chat & Live Camera */}
              <div className="gemini-mode-pills">
                <button
                  className={`gemini-mode-pill ${activeMode === 'chat' ? 'active' : ''}`}
                  onClick={() => setActiveMode('chat')}
                >
                  Recipe Chat
                </button>
                <button
                  className={`gemini-mode-pill ${activeMode === 'scan' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveMode('scan');
                    setIsCameraModalOpen(true);
                  }}
                >
                  Live Camera Scan
                </button>
              </div>

              {/* Prompt Starter Chips */}
              <div className="gemini-prompt-chips">
                <button
                  className="gemini-prompt-chip"
                  onClick={() => setIsCameraModalOpen(true)}
                >
                  <Camera size={14} color="var(--gemini-emerald)" /> Live Camera Scan Food
                </button>
                <button
                  className="gemini-prompt-chip"
                  onClick={() => hiddenGalleryInputRef.current?.click()}
                >
                  <ImageIcon size={14} color="var(--gemini-cyan)" /> Upload Food Photo from Phone
                </button>
                <button
                  className="gemini-prompt-chip"
                  onClick={() => handleSendMessage('Suggest a healthy 15-minute low calorie high protein meal.')}
                >
                  <Flame size={14} color="var(--gemini-amber)" /> Healthy 15-min low-calorie dinner
                </button>
                <button
                  className="gemini-prompt-chip"
                  onClick={() => handleSendMessage('What high-protein meals can I cook with paneer, spinach, and tomatoes?')}
                >
                  <UtensilsCrossed size={14} color="var(--gemini-emerald)" /> High-protein meal idea
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Conversation Flow */
          <div className="gemini-chat-container">
            <div className="gemini-messages-scroll">
              {messages.map((msg) => (
                <div key={msg.id} className={msg.role === 'user' ? 'gemini-msg-user' : 'gemini-msg-assistant'}>
                  {msg.role === 'assistant' && (
                    <div className="gemini-msg-avatar">
                      <NutriLensLogo size={24} />
                    </div>
                  )}

                  <div className={msg.role === 'user' ? 'gemini-msg-user-bubble' : 'gemini-msg-content'}>
                    {/* User Attached Photo */}
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="gemini-msg-user-img" />
                    )}

                    {/* User Prompt Text */}
                    {msg.text && <div>{msg.text}</div>}

                    {/* Food Recognition Banner */}
                    {msg.food_name && msg.category && (
                      <div className="gemini-detected-banner" style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
                        borderColor: 'rgba(16, 185, 129, 0.35)'
                      }}>
                        <div className="gemini-detected-name">
                          <ChefHat size={20} color="var(--gemini-emerald)" />
                          {msg.food_name}
                        </div>
                        <div className="gemini-detected-meta" style={{
                          color: '#34d399',
                          background: 'rgba(16, 185, 129, 0.18)'
                        }}>
                          {msg.confidence || '98% Match'} • {msg.category}
                        </div>
                      </div>
                    )}

                    {/* Low Confidence Confirmation: Not sure, please pick the right one */}
                    {msg.needs_confirmation && msg.top_3 && msg.top_3.length > 0 && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        marginTop: '10px',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: 'var(--gemini-amber)',
                          fontSize: '13px',
                          fontWeight: 600,
                          marginBottom: '10px'
                        }}>
                          <AlertCircle size={16} />
                          Not sure, please pick the right one:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {msg.top_3.map((cand, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleUserPickCorrection(msg.id, cand, msg.image_raw)}
                              style={{
                                background: 'var(--gemini-surface-hover)',
                                border: '1px solid var(--gemini-border)',
                                color: '#fff',
                                padding: '8px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gemini-emerald)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gemini-border)'; }}
                            >
                              <strong>{cand.label || cand.name || cand.class}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--gemini-text-secondary)' }}>
                                ({cand.confidence_percent || Math.round(cand.confidence * 100)}%)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nutritional Macros Breakdown Bar */}
                    {msg.nutrition && (
                      <div className="gemini-nutri-bar">
                        <div className="gemini-nutri-badge">
                          <Flame size={14} color="var(--gemini-amber)" />
                          <strong>{msg.nutrition.calories}</strong> kcal
                        </div>
                        <div className="gemini-nutri-badge">
                          Protein: <strong>{msg.nutrition.protein}g</strong>
                        </div>
                        <div className="gemini-nutri-badge">
                          Carbs: <strong>{msg.nutrition.carbs}g</strong>
                        </div>
                        <div className="gemini-nutri-badge">
                          Fat: <strong>{msg.nutrition.fat}g</strong>
                        </div>
                        <div className="gemini-nutri-badge">
                          Fiber: <strong>{msg.nutrition.fiber}g</strong>
                        </div>
                      </div>
                    )}

                    {/* Error Banner */}
                    {msg.isError && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#f87171',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '6px'
                      }}>
                        <AlertCircle size={16} />
                        <span>{msg.summary}</span>
                      </div>
                    )}

                    {/* Summary */}
                    {msg.summary && !msg.isError && (
                      <div style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--gemini-text-primary)' }}>
                        {msg.summary}
                      </div>
                    )}

                    {/* Nemotron Reasoning Chain */}
                    {msg.reasoning && (
                      <details style={{
                        marginTop: '8px',
                        background: 'rgba(118, 185, 0, 0.06)',
                        border: '1px solid rgba(118, 185, 0, 0.25)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#76b900' }}>
                          Nemotron 3.5 Reasoning Chain
                        </summary>
                        <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: 1.4, fontSize: '11px', color: 'var(--gemini-text-muted)' }}>
                          {msg.reasoning}
                        </div>
                      </details>
                    )}

                    {/* Quick Idea Cards (Requirement 5) */}
                    {((msg.simple_recipes && msg.simple_recipes.length > 0) || msg.recipe) && (
                      <div className="gemini-simple-ideas-section">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UtensilsCrossed size={16} color="var(--gemini-emerald)" />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gemini-text-primary)' }}>
                              Quick Everyday Ideas ({((msg.simple_recipes && msg.simple_recipes.length > 0) ? msg.simple_recipes : [msg.recipe]).length})
                            </span>
                          </div>
                          <span className="quick-idea-badge">
                            <Sparkles size={11} /> quick idea
                          </span>
                        </div>

                        <div className="gemini-simple-cards-grid">
                          {((msg.simple_recipes && msg.simple_recipes.length > 0) ? msg.simple_recipes : [msg.recipe]).map((idea, ideaIdx) => {
                            const ideaName = idea.name || idea.title || 'Quick Idea';
                            const ideaType = idea.type || 'snack';
                            const ideaTime = idea.time_minutes || 5;
                            const rawIngredients = idea.ingredients || [];
                            const rawSteps = idea.steps || idea.instructions || [];

                            return (
                              <div key={ideaIdx} className="gemini-simple-card">
                                <div className="gemini-simple-card-header">
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div className="gemini-simple-card-title">{ideaName}</div>
                                    <span className="quick-idea-badge">
                                      <Sparkles size={10} /> quick idea
                                    </span>
                                  </div>
                                  <div className="gemini-simple-card-meta">
                                    <span className="gemini-simple-type-tag">{ideaType}</span>
                                    <span className="gemini-simple-time-tag">
                                      <Clock size={12} /> {ideaTime} mins
                                    </span>
                                    {idea.source && (
                                      <span style={{ fontSize: '10px', color: 'var(--gemini-text-muted)', marginLeft: 'auto' }}>
                                        {idea.source === 'template' ? 'verified template' : 'fresh idea'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Ingredients with quantities */}
                                <div className="gemini-simple-ingredients">
                                  <div className="gemini-simple-section-title">Ingredients:</div>
                                  <ul className="gemini-simple-ing-list">
                                    {rawIngredients.map((ing, iIdx) => {
                                      const qty = ing.quantity || ing.amount || '';
                                      const item = ing.item || ing.name || '';
                                      const checkKey = `${msg.id}-${ideaIdx}-${iIdx}`;
                                      const isChecked = !!checkedIngredients[checkKey];
                                      return (
                                        <li
                                          key={iIdx}
                                          className={`gemini-simple-ing-item ${isChecked ? 'checked' : ''}`}
                                          onClick={() => toggleIngredient(msg.id, `${ideaIdx}-${iIdx}`)}
                                        >
                                          <div className="gemini-mini-checkbox">
                                            {isChecked && <Check size={10} color="#000" />}
                                          </div>
                                          <span>
                                            <strong>{qty}</strong> {item}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>

                                {/* Steps */}
                                <div className="gemini-simple-steps">
                                  <div className="gemini-simple-section-title">Steps:</div>
                                  <ol className="gemini-simple-step-list">
                                    {rawSteps.map((step, sIdx) => (
                                      <li key={sIdx} className="gemini-simple-step-item">
                                        <span className="gemini-step-pill">{sIdx + 1}</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Show more ideas button (Requirement 5) */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                          <button
                            className="gemini-show-more-btn"
                            disabled={loadingMoreId === msg.id}
                            onClick={() => handleShowMoreIdeas(msg.id)}
                          >
                            <Sparkles size={14} color="var(--gemini-emerald)" />
                            {loadingMoreId === msg.id ? 'Loading more ideas...' : 'Show more ideas'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    {msg.role === 'assistant' && !msg.isError && (
                      <div className="gemini-msg-actions">
                        {msg.recipe && (
                          <button
                            className="gemini-action-btn"
                            onClick={() => handleCopyRecipe(msg.recipe, msg.id)}
                            title="Copy Recipe"
                          >
                            {copiedId === msg.id ? <Check size={13} color="var(--gemini-emerald)" /> : <Copy size={13} />}
                            {copiedId === msg.id ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                        <button
                          className="gemini-action-btn"
                          onClick={() => handleReadAloud(msg.recipe?.instructions?.join('. ') || msg.summary)}
                          title="Read Aloud"
                        >
                          <Volume2 size={13} /> Listen
                        </button>
                        <button
                          className="gemini-action-btn"
                          onClick={() => handleSendMessage('Suggest alternative ingredients or substitutions for this recipe.')}
                          title="Ask for substitutions"
                        >
                          Substitutions
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing / Loading Skeleton */}
              {isLoading && (
                <div className="gemini-msg-assistant">
                  <div className="gemini-msg-avatar">
                    <NutriLensLogo size={24} className="animate-spin" />
                  </div>
                  <div className="gemini-msg-content" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gemini-text-muted)', fontSize: '14px' }}>
                    <span>
                      {activeProvider === 'nvidia'
                        ? 'NVIDIA Nemotron 3.5 Super VL is analyzing image & reasoning...'
                        : 'NutriLens LLM is recognizing food & crafting recipe...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Sticky Input Bar */}
            <div className="gemini-chat-bottom-bar">
              <div className="gemini-capsule" style={{ maxWidth: '820px' }}>
                {attachedImage && (
                  <div className="gemini-capsule-attachment">
                    <img src={attachedImage.base64} alt="Attached food" />
                    <div className="gemini-capsule-attachment-info">
                      <span className="gemini-capsule-attachment-title">{attachedImage.name || 'Food Photo'}</span>
                      <span className="gemini-capsule-attachment-desc">Ready for NutriLens AI scan</span>
                    </div>
                    <button
                      className="gemini-capsule-attachment-remove"
                      onClick={() => setAttachedImage(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="gemini-capsule-row">
                  <button
                    className="gemini-capsule-plus-btn"
                    onClick={() => setIsCameraModalOpen(true)}
                    title="Live Camera Food Scanner"
                  >
                    <Camera size={20} color="var(--gemini-emerald)" />
                  </button>

                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask NutriLens Chef (e.g. 'Can I make it in an air fryer?')..."
                    className="gemini-capsule-input"
                  />

                  <div className="gemini-capsule-actions">
                    <button
                      className="gemini-capsule-icon-btn"
                      onClick={() => hiddenGalleryInputRef.current?.click()}
                      title="Upload from Device"
                    >
                      <ImageIcon size={18} />
                    </button>

                    <button
                      className={`gemini-capsule-icon-btn ${isRecording ? 'recording' : ''}`}
                      onClick={toggleVoiceRecording}
                      title="Voice input"
                    >
                      <Mic size={18} />
                    </button>

                    <button
                      className={`gemini-capsule-submit-btn ${(inputText.trim() || attachedImage) ? 'ready' : ''}`}
                      onClick={() => handleSendMessage()}
                      style={(inputText.trim() || attachedImage) ? { background: 'var(--gemini-emerald)', color: '#062b1e' } : {}}
                    >
                      <ArrowUp size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal (Google AI Studio & OpenAI ChatGPT Keys) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveProvider(getActiveProvider());
        }}
        dietGoal={dietGoal}
        setDietGoal={setDietGoal}
        onClearHistory={clearChatHistory}
      />

      {/* Live Camera Scanner Modal (Zero Stock Images, Real Device Capture) */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(base64, name) => {
          setAttachedImage({ base64, name });
          showToast(`Food captured with camera! Tap send or type instructions.`);
        }}
      />
    </div>
  );
}
