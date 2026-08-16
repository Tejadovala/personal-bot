import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Share2, Layers, Send, ChevronRight,
  Smartphone, Monitor, RotateCcw, Sparkles, Check,
  Copy, ExternalLink, X, Eye
} from 'lucide-react';
import usePrototypeStore from '../store/prototypeStore';

// Lazy-load ScreenRenderer since it depends on the prototype components
import { lazy, Suspense } from 'react';

function PhoneFrame({ children }) {
  return (
    <div className="phone-frame mx-auto">
      <div className="phone-notch" />
      <div className="phone-home-indicator" />
      <div className="phone-screen">
        {children}
      </div>
    </div>
  );
}

function FlowSidebar({ screens, activeScreenId, onSelectScreen, flow }) {
  return (
    <div className="w-64 bg-white border-r border-neutral-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Screens ({screens.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {screens.map((screen, i) => {
          const isActive = screen.screen_id === activeScreenId;
          const isStart = screen.screen_id === flow?.start_screen;

          return (
            <button
              key={screen.screen_id}
              onClick={() => onSelectScreen(screen.screen_id)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all ${
                isActive
                  ? 'bg-accent-50 border-r-2 border-accent-500'
                  : 'hover:bg-neutral-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold ${
                isActive
                  ? 'bg-accent-500 text-white'
                  : 'bg-neutral-100 text-neutral-500'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isActive ? 'text-accent-700' : 'text-neutral-700'
                }`}>
                  {screen.title}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {screen.components?.length || 0} components
                  {isStart && ' • Start'}
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${
                isActive ? 'text-accent-400' : 'text-neutral-300'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditPanel({ activeScreen, onEdit, isEditing }) {
  const [editPrompt, setEditPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editPrompt.trim() || isEditing) return;
    onEdit(editPrompt);
    setEditPrompt('');
  };

  return (
    <div className="bg-white border-t border-neutral-200 px-6 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-accent-500" />
        <span className="text-xs font-semibold text-neutral-500">
          Edit "{activeScreen?.title || 'screen'}"
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder="Make the paywall show 3 pricing tiers instead of 2..."
          className="flex-1 h-10 px-4 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 transition-all"
          disabled={isEditing}
        />
        <button
          type="submit"
          disabled={!editPrompt.trim() || isEditing}
          className="h-10 px-4 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isEditing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
    </div>
  );
}

function ShareModal({ prototype, onClose, onToggleShare }) {
  const shareUrl = prototype?.share_id
    ? `${window.location.origin}/share/${prototype.share_id}`
    : null;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4"
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-neutral-900">Share Prototype</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle sharing */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-100 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-accent-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-800">Public link</div>
              <div className="text-xs text-neutral-500">Anyone with the link can view</div>
            </div>
          </div>
          <button
            onClick={onToggleShare}
            className={`relative w-11 h-6 rounded-full transition-all ${
              prototype?.share_enabled ? 'bg-accent-500' : 'bg-neutral-300'
            }`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              prototype?.share_enabled ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {/* Share URL */}
        {shareUrl && prototype?.share_enabled ? (
          <div className="flex gap-2">
            <div className="flex-1 h-10 px-3 bg-neutral-100 rounded-lg flex items-center">
              <span className="text-xs text-neutral-600 truncate font-mono">{shareUrl}</span>
            </div>
            <button
              onClick={handleCopy}
              className="h-10 px-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 text-center py-2">
            Enable the public link to share your prototype
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const [ScreenRenderer, setScreenRenderer] = useState(null);

  const {
    activePrototype, activeFlow, activeScreenId,
    isGenerating, isEditing, error,
    loadPrototype, navigateToScreen, goBack,
    editScreen, toggleShare, resetActive,
  } = usePrototypeStore();

  // Dynamically import ScreenRenderer
  useEffect(() => {
    import('../components/prototype/ScreenRenderer.jsx')
      .then((mod) => setScreenRenderer(() => mod.default))
      .catch((err) => console.error('Failed to load ScreenRenderer:', err));
  }, []);

  // Load prototype on mount
  useEffect(() => {
    if (id) {
      loadPrototype(id);
    }
    return () => resetActive();
  }, [id]);

  const activeScreen = activeFlow?.screens?.find((s) => s.screen_id === activeScreenId);

  const handleNavigate = (screenId) => {
    navigateToScreen(screenId);
  };

  const handleEdit = async (editPrompt) => {
    if (activeScreenId) {
      await editScreen(activeScreenId, editPrompt);
    }
  };

  const handleToggleShare = async () => {
    await toggleShare();
  };

  // Loading state
  if (isGenerating && !activeFlow) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex gap-1 justify-center mb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-accent-400 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity, repeatDelay: 0.5 }}
              />
            ))}
          </div>
          <p className="text-sm text-neutral-500">Loading prototype...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-neutral-200" />
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-accent-500 to-accent-700 rounded-md flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
          </Link>
          <h1 className="text-sm font-semibold text-neutral-800">
            {activeFlow?.name || 'Untitled Prototype'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeFlow?.start_screen) {
                navigateToScreen(activeFlow.start_screen);
              }
            }}
            className="h-8 px-3 rounded-lg hover:bg-neutral-100 text-xs font-medium text-neutral-600 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Restart
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="h-8 px-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - Flow overview */}
        {activeFlow && (
          <FlowSidebar
            screens={activeFlow.screens}
            activeScreenId={activeScreenId}
            onSelectScreen={navigateToScreen}
            flow={activeFlow}
          />
        )}

        {/* Center - Phone preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {activeScreen && ScreenRenderer ? (
              <motion.div
                key={activeScreenId}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <PhoneFrame>
                  <ScreenRenderer
                    screen={activeScreen}
                    onNavigate={handleNavigate}
                  />
                </PhoneFrame>
              </motion.div>
            ) : (
              <div className="text-center text-neutral-400">
                <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a screen to preview</p>
              </div>
            )}
          </div>

          {/* Bottom edit panel */}
          {activeScreen && (
            <EditPanel
              activeScreen={activeScreen}
              onEdit={handleEdit}
              isEditing={isEditing}
            />
          )}
        </div>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            prototype={activePrototype}
            onClose={() => setShowShareModal(false)}
            onToggleShare={handleToggleShare}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
