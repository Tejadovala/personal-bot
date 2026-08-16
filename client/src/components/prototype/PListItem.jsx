import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { getIcon } from './iconMap';

export default function PListItem({
  title,
  subtitle,
  icon,
  right_text,
  on_tap,
  show_chevron = true,
  onNavigate,
}) {
  const IconComponent = getIcon(icon);
  const isClickable = !!on_tap;

  const content = (
    <div className="flex items-center gap-3 py-3">
      {IconComponent && (
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <IconComponent size={18} className="text-gray-500" strokeWidth={1.8} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {right_text && (
          <span className="text-xs text-gray-400 font-medium">{right_text}</span>
        )}
        {show_chevron && isClickable && (
          <ChevronRight size={16} className="text-gray-300" />
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      className="px-4"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {isClickable ? (
        <button
          className="w-full text-left border-b border-gray-100 last:border-0 cursor-pointer active:bg-gray-50 transition-colors rounded-lg"
          onClick={() => onNavigate && onNavigate(on_tap)}
        >
          {content}
        </button>
      ) : (
        <div className="border-b border-gray-100 last:border-0">
          {content}
        </div>
      )}
    </motion.div>
  );
}
