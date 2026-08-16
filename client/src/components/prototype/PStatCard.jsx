import { motion } from 'framer-motion';
import { getIcon } from './iconMap';

export default function PStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'indigo',
  on_tap,
  onNavigate,
}) {
  const IconComponent = getIcon(icon);

  const colorMap = {
    indigo: {
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-500',
      trendText: 'text-emerald-500',
    },
    blue: {
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-500',
      trendText: 'text-emerald-500',
    },
    green: {
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-500',
      trendText: 'text-emerald-500',
    },
    rose: {
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-500',
      trendText: 'text-emerald-500',
    },
    amber: {
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-500',
      trendText: 'text-emerald-500',
    },
  };

  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className="px-4">
      <motion.div
        className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm ${
          on_tap ? 'cursor-pointer active:shadow-none' : ''
        }`}
        onClick={() => on_tap && onNavigate && onNavigate(on_tap)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        whileTap={on_tap ? { scale: 0.98 } : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {title && (
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {title}
              </p>
            )}
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-1.5 mt-1">
                {trend && (
                  <span className={`text-xs font-semibold ${colors.trendText}`}>
                    {trend}
                  </span>
                )}
                {subtitle && (
                  <span className="text-xs text-gray-400">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          {IconComponent && (
            <div
              className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center shrink-0`}
            >
              <IconComponent size={20} className={colors.iconText} strokeWidth={1.8} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
