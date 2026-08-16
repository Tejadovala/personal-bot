import { motion } from 'framer-motion';
import { getIcon } from './iconMap';

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizeMap = {
  sm: 14,
  md: 18,
  lg: 22,
};

const variantStyles = {
  primary: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25',
  secondary: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  outline: 'bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-500 hover:bg-gray-100',
};

export default function PIconButton({
  icon,
  size = 'md',
  variant = 'secondary',
  on_tap,
  onNavigate,
}) {
  const IconComponent = getIcon(icon);
  if (!IconComponent) return null;

  const sizeClass = sizeMap[size] || sizeMap.md;
  const iconSize = iconSizeMap[size] || iconSizeMap.md;
  const style = variantStyles[variant] || variantStyles.secondary;

  return (
    <motion.button
      className={`${sizeClass} rounded-full flex items-center justify-center cursor-pointer transition-all ${style}`}
      onClick={() => on_tap && onNavigate && onNavigate(on_tap)}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <IconComponent size={iconSize} strokeWidth={2} />
    </motion.button>
  );
}
