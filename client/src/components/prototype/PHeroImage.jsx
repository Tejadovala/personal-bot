import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import { getIcon } from './iconMap';

export default function PHeroImage({
  icon,
  title,
  subtitle,
  height = 200,
  gradient = 'indigo',
  onNavigate,
}) {
  const IconComponent = getIcon(icon) || ImageIcon;

  const gradientMap = {
    indigo: 'from-indigo-400 via-violet-500 to-purple-600',
    blue: 'from-blue-400 via-cyan-500 to-teal-500',
    rose: 'from-rose-400 via-pink-500 to-fuchsia-600',
    amber: 'from-amber-400 via-orange-500 to-red-500',
    green: 'from-emerald-400 via-green-500 to-teal-600',
    dark: 'from-gray-700 via-gray-800 to-gray-900',
  };

  const gradientClass = gradientMap[gradient] || gradientMap.indigo;

  return (
    <motion.div
      className={`w-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center gap-3 relative overflow-hidden`}
      style={{ minHeight: `${height}px` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Decorative circles */}
      <div className="absolute top-[-30px] right-[-30px] w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-white/5" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="relative z-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <IconComponent size={32} className="text-white" strokeWidth={1.5} />
        </div>
      </motion.div>

      {title && (
        <motion.h2
          className="text-lg font-bold text-white relative z-10 text-center px-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {title}
        </motion.h2>
      )}

      {subtitle && (
        <motion.p
          className="text-sm text-white/80 relative z-10 text-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
