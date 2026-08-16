import { motion } from 'framer-motion';

const levelStyles = {
  1: 'text-2xl font-bold text-gray-900 tracking-tight',
  2: 'text-xl font-semibold text-gray-900 tracking-tight',
  3: 'text-base font-semibold text-gray-800',
};

export default function PHeading({ text, level = 1, align = 'left', onNavigate }) {
  const style = levelStyles[level] || levelStyles[1];

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-left';

  return (
    <motion.div
      className="px-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {level === 1 && (
        <h1 className={`${style} ${alignClass}`}>{text}</h1>
      )}
      {level === 2 && (
        <h2 className={`${style} ${alignClass}`}>{text}</h2>
      )}
      {level === 3 && (
        <h3 className={`${style} ${alignClass}`}>{text}</h3>
      )}
    </motion.div>
  );
}
