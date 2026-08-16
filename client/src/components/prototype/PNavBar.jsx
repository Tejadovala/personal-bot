import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getIcon } from './iconMap';

export default function PNavBar({
  title,
  back_text,
  show_back,
  on_back,
  right_icon,
  right_on_tap,
  transparent = false,
  onNavigate,
}) {
  const RightIcon = getIcon(right_icon);

  return (
    <motion.div
      className={`sticky top-0 z-30 px-4 flex items-center h-11 ${
        transparent
          ? 'bg-transparent'
          : 'bg-white/80 backdrop-blur-xl border-b border-gray-100'
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Left: Back button */}
      <div className="flex-1 flex justify-start">
        {show_back !== false && on_back && (
          <button
            className="flex items-center gap-0.5 text-indigo-500 font-medium text-sm cursor-pointer -ml-1 active:opacity-60 transition-opacity"
            onClick={() => onNavigate && onNavigate(on_back)}
          >
            <ArrowLeft size={18} strokeWidth={2} />
            {back_text && <span>{back_text}</span>}
          </button>
        )}
      </div>

      {/* Center: Title */}
      <div className="flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-900 text-center truncate max-w-[180px]">
          {title}
        </h1>
      </div>

      {/* Right: Optional action */}
      <div className="flex-1 flex justify-end">
        {RightIcon && (
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 cursor-pointer active:opacity-60 transition-all"
            onClick={() => right_on_tap && onNavigate && onNavigate(right_on_tap)}
          >
            <RightIcon size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
