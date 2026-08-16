import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { getIcon } from './iconMap';

export default function POptionCard({
  text,
  title,
  subtitle,
  icon,
  selected = false,
  on_tap,
  onNavigate,
}) {
  const IconComponent = getIcon(icon);

  return (
    <div className="px-4">
      <motion.button
        className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
          selected
            ? 'border-indigo-300 bg-indigo-50/70 shadow-sm shadow-indigo-100'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }`}
        onClick={() => on_tap && onNavigate && onNavigate(on_tap)}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {IconComponent && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selected
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <IconComponent size={20} strokeWidth={1.8} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${
              selected ? 'text-indigo-900' : 'text-gray-800'
            }`}
          >
            {text || title}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
        <ChevronRight
          size={16}
          className={`shrink-0 ${
            selected ? 'text-indigo-400' : 'text-gray-300'
          }`}
        />
      </motion.button>
    </div>
  );
}
