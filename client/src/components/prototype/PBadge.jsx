import { motion } from 'framer-motion';

const variantStyles = {
  info: 'bg-blue-50 text-blue-600 border-blue-200',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-600 border-red-200',
  default: 'bg-gray-50 text-gray-600 border-gray-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
};

export default function PBadge({ text, variant = 'default', onNavigate }) {
  const style = variantStyles[variant] || variantStyles.default;

  return (
    <motion.span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {text}
    </motion.span>
  );
}
