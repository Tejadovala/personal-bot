import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import usePrototypeStore from '../store/prototypeStore';

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

export default function SharePage() {
  const { shareId } = useParams();
  const [ScreenRenderer, setScreenRenderer] = useState(null);

  const {
    activePrototype, activeFlow, activeScreenId,
    isGenerating, error,
    loadSharedPrototype, navigateToScreen, resetActive,
  } = usePrototypeStore();

  // Dynamically import ScreenRenderer
  useEffect(() => {
    import('../components/prototype/ScreenRenderer.jsx')
      .then((mod) => setScreenRenderer(() => mod.default))
      .catch((err) => console.error('Failed to load ScreenRenderer:', err));
  }, []);

  useEffect(() => {
    if (shareId) {
      loadSharedPrototype(shareId);
    }
    return () => resetActive();
  }, [shareId]);

  const activeScreen = activeFlow?.screens?.find((s) => s.screen_id === activeScreenId);

  const handleNavigate = (screenId) => {
    navigateToScreen(screenId);
  };

  // Loading
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-accent-400 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-2">Prototype not found</h1>
          <p className="text-sm text-neutral-400">This link may have expired or been disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center py-8 px-4">
      {/* Prototype name */}
      {activeFlow && (
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-lg font-semibold text-white">{activeFlow.name}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {activeFlow.screens?.length || 0} screens • Click through to navigate
          </p>
        </motion.div>
      )}

      {/* Phone preview */}
      {activeScreen && ScreenRenderer ? (
        <motion.div
          key={activeScreenId}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PhoneFrame>
            <ScreenRenderer
              screen={activeScreen}
              onNavigate={handleNavigate}
            />
          </PhoneFrame>
        </motion.div>
      ) : null}

      {/* Screen indicator */}
      {activeFlow && (
        <div className="flex gap-1.5 mt-6">
          {activeFlow.screens?.map((screen) => (
            <button
              key={screen.screen_id}
              onClick={() => navigateToScreen(screen.screen_id)}
              className={`h-1.5 rounded-full transition-all ${
                screen.screen_id === activeScreenId
                  ? 'w-6 bg-accent-500'
                  : 'w-1.5 bg-neutral-700 hover:bg-neutral-600'
              }`}
              title={screen.title}
            />
          ))}
        </div>
      )}

      {/* Watermark for free tier */}
      {activePrototype?.user_plan === 'free' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
          <Layers className="w-3 h-3 text-white/60" />
          <span className="text-xs text-white/60 font-medium">Made with pdesign</span>
        </div>
      )}
    </div>
  );
}
