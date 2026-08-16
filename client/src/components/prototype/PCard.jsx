import { motion } from 'framer-motion';

export default function PCard({
  title,
  subtitle,
  children,
  padding = true,
  shadow = true,
  renderChildren,
  onNavigate,
}) {
  return (
    <div className="px-4">
      <motion.div
        className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${
          shadow ? 'shadow-sm' : ''
        }`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {(title || subtitle) && (
          <div className={`${padding ? 'px-4 pt-4' : 'px-3 pt-3'} ${!children && !renderChildren ? (padding ? 'pb-4' : 'pb-3') : 'pb-2'}`}>
            {title && (
              <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
        {renderChildren && (
          <div className="space-y-2 pb-3">
            {renderChildren}
          </div>
        )}
        {children && (
          <div className={padding ? 'px-4 pb-4' : 'px-3 pb-3'}>
            {children}
          </div>
        )}
      </motion.div>
    </div>
  );
}
