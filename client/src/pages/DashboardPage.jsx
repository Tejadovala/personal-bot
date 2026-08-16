import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Layers, LogOut, Trash2, Share2, Clock,
  MoreVertical, ExternalLink, Sparkles
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import usePrototypeStore from '../store/prototypeStore';

function PrototypeCard({ prototype, onDelete, onNewPrototype }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  let flow = null;
  try {
    flow = typeof prototype.flow_json === 'string'
      ? JSON.parse(prototype.flow_json)
      : prototype.flow_json;
  } catch { }

  const screenCount = flow?.screens?.length || 0;
  const timeAgo = getTimeAgo(prototype.created_at);

  return (
    <motion.div
      className="group relative bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:border-accent-300 hover:shadow-md transition-all cursor-pointer"
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/editor/${prototype.id}`)}
    >
      {/* Preview thumbnail */}
      <div className="h-40 bg-gradient-to-br from-neutral-50 to-neutral-100 p-4 flex items-center justify-center relative">
        <div className="w-20 h-36 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-3 bg-neutral-900 rounded-b-sm mx-auto w-10" />
          <div className="p-2 space-y-1.5 mt-1">
            <div className="h-1.5 bg-neutral-200 rounded w-full" />
            <div className="h-1.5 bg-neutral-200 rounded w-3/4" />
            <div className="h-3 bg-accent-200 rounded w-full mt-2" />
            <div className="h-1.5 bg-neutral-200 rounded w-full mt-2" />
            <div className="h-1.5 bg-neutral-200 rounded w-2/3" />
          </div>
        </div>

        {/* Screen count badge */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-neutral-600 border border-neutral-100">
          {screenCount} screens
        </div>

        {/* Menu button */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-700 border border-neutral-100"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <>
              {/* Click-outside overlay */}
              <div
                className="fixed inset-0 z-0"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
              />
              <div className="absolute top-8 left-0 bg-white rounded-xl border border-neutral-200 shadow-lg py-1.5 min-w-[140px] z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (prototype.share_id) {
                      navigator.clipboard.writeText(`${window.location.origin}/share/${prototype.share_id}`);
                    } else {
                      alert('Enable sharing in the editor first.');
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${prototype.name}"? This cannot be undone.`)) {
                      onDelete(prototype.id);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-neutral-900 truncate mb-1">
          {prototype.name || flow?.name || 'Untitled Prototype'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { prototypes, isLoadingList, fetchPrototypes, deletePrototype } = usePrototypeStore();

  useEffect(() => {
    fetchPrototypes();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900">pdesign</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/billing"
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                user?.plan === 'pro'
                  ? 'bg-accent-50 text-accent-700 border border-accent-200'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {user?.plan === 'pro' ? '✦ Pro' : 'Free — Upgrade'}
            </Link>
            <span className="text-sm text-neutral-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-950">Your Prototypes</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {prototypes.length === 0
                ? 'Create your first prototype to get started'
                : `${prototypes.length} prototype${prototypes.length !== 1 ? 's' : ''}${
                    user?.plan !== 'pro' ? ' / 2 free' : ''
                  }`}
            </p>
          </div>
          <button
            onClick={() => {
              if (user?.plan !== 'pro' && prototypes.length >= 2) {
                navigate('/billing');
              } else {
                navigate('/new');
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Prototype
          </button>
        </div>

        {/* Free tier limit banner */}
        {user?.plan !== 'pro' && prototypes.length >= 2 && (
          <motion.div
            className="mb-6 p-4 rounded-xl bg-accent-50 border border-accent-200 flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent-600" />
              <div>
                <p className="text-sm font-semibold text-accent-800">Free plan limit reached</p>
                <p className="text-xs text-accent-600">Upgrade to Pro for unlimited prototypes</p>
              </div>
            </div>
            <Link
              to="/billing"
              className="px-4 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Upgrade
            </Link>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoadingList && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="h-40 animate-shimmer" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-2/3" />
                  <div className="h-3 bg-neutral-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingList && prototypes.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-20 h-20 bg-accent-50 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-accent-400" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">No prototypes yet</h2>
            <p className="text-sm text-neutral-500 mb-8 max-w-sm text-center">
              Describe a product flow in plain English and get a clickable prototype in seconds.
            </p>
            <button
              onClick={() => navigate('/new')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Your First Prototype
            </button>
          </motion.div>
        )}

        {/* Prototype grid */}
        {!isLoadingList && prototypes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New prototype card */}
            <motion.button
              className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-200 rounded-2xl hover:border-accent-400 hover:bg-accent-50/30 transition-all group"
              whileHover={{ y: -2 }}
              onClick={() => {
                if (user?.plan !== 'pro' && prototypes.length >= 2) {
                  navigate('/billing');
                } else {
                  navigate('/new');
                }
              }}
            >
              <div className="w-12 h-12 bg-neutral-100 group-hover:bg-accent-100 rounded-xl flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-5 h-5 text-neutral-400 group-hover:text-accent-600" />
              </div>
              <span className="text-sm font-medium text-neutral-500 group-hover:text-accent-600">
                New Prototype
              </span>
            </motion.button>

            {/* Existing prototypes */}
            {prototypes.map((proto, i) => (
              <motion.div
                key={proto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <PrototypeCard prototype={proto} onDelete={deletePrototype} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
