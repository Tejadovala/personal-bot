import { motion } from 'framer-motion';
import { getIcon } from './iconMap';

export default function PTabBar({ tabs = [], onNavigate }) {
  return (
    <motion.div
      className="sticky bottom-0 z-30 bg-white/90 backdrop-blur-xl border-t border-gray-200 px-2 pb-[env(safe-area-inset-bottom,0px)]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-around h-12">
        {(tabs || []).map((tab, idx) => {
          const IconComponent = getIcon(tab.icon);
          const isActive = tab.active;

          return (
            <button
              key={idx}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer active:opacity-60 transition-opacity"
              onClick={() => tab.on_tap && onNavigate && onNavigate(tab.on_tap)}
            >
              {IconComponent && (
                <IconComponent
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-indigo-500' : 'text-gray-400'
                  }`}
                />
              )}
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-indigo-500' : 'text-gray-400'
                }`}
              >
                {tab.text}
              </span>
              {isActive && (
                <motion.div
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-indigo-500"
                  layoutId="tabIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
