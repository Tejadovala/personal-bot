import { motion } from 'framer-motion';

const variantStyles = {
  body: 'text-sm text-gray-600 leading-relaxed',
  caption: 'text-xs text-gray-400 leading-normal',
  label: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wider',
};

export default function PText({ text, variant = 'body', align = 'left', onNavigate }) {
  const style = variantStyles[variant] || variantStyles.body;

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-left';

  return (
    <motion.p
      className={`px-4 ${style} ${alignClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      {text}
    </motion.p>
  );
}
