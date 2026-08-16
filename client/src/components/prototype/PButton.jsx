import { motion } from 'framer-motion';
import { getIcon } from './iconMap';

const variantStyles = {
  primary:
    'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98]',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-250 active:scale-[0.98]',
  outline:
    'bg-transparent border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98]',
  danger:
    'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 active:scale-[0.98]',
  destructive:
    'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 active:scale-[0.98]',
};

export default function PButton({ text, variant = 'primary', icon, on_tap, full_width = true, onNavigate }) {
  const style = variantStyles[variant] || variantStyles.primary;
  const IconComponent = getIcon(icon);
  const widthClass = full_width ? 'w-full' : 'w-auto px-6';

  return (
    <div className="px-4">
      <motion.button
        className={`${widthClass} py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${style}`}
        onClick={() => on_tap && onNavigate && onNavigate(on_tap)}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {IconComponent && <IconComponent size={18} strokeWidth={2} />}
        {text}
      </motion.button>
    </div>
  );
}
