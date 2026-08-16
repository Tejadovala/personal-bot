import { motion } from 'framer-motion';

export default function PProgressBar({
  value = 0,
  max = 100,
  label,
  show_percentage = true,
  color = 'indigo',
  onNavigate,
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colorMap = {
    indigo: 'from-indigo-500 to-violet-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
  };

  const gradientClass = colorMap[color] || colorMap.indigo;

  return (
    <div className="px-4">
      {(label || show_percentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-gray-600">{label}</span>
          )}
          {show_percentage && (
            <span className="text-xs font-semibold text-gray-500">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}
