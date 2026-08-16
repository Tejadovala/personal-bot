import { motion } from 'framer-motion';

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
  xl: { container: 'w-20 h-20', text: 'text-xl' },
};

const colorPalette = [
  'from-indigo-400 to-violet-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-400 to-purple-500',
];

function getColorFromInitials(initials) {
  if (!initials) return colorPalette[0];
  const charCode = initials.charCodeAt(0);
  return colorPalette[charCode % colorPalette.length];
}

export default function PAvatar({
  initials,
  name,
  size = 'md',
  color,
  onNavigate,
}) {
  const displayInitials =
    initials ||
    (name
      ? name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?');

  const sizeStyle = sizeMap[size] || sizeMap.md;
  const gradientClass = color || getColorFromInitials(displayInitials);

  return (
    <motion.div
      className={`${sizeStyle.container} rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center shrink-0 shadow-sm`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <span className={`${sizeStyle.text} font-semibold text-white`}>
        {displayInitials}
      </span>
    </motion.div>
  );
}
