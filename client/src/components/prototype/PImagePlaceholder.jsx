import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import { getIcon } from './iconMap';

const aspectRatioMap = {
  'square': 'aspect-square',
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '3:2': 'aspect-[3/2]',
  '2:1': 'aspect-[2/1]',
  '3:4': 'aspect-[3/4]',
  '2:3': 'aspect-[2/3]',
};

export default function PImagePlaceholder({
  aspect_ratio = '16:9',
  icon,
  label,
  rounded = true,
  onNavigate,
}) {
  const aspectClass = aspectRatioMap[aspect_ratio] || 'aspect-video';
  const IconComponent = getIcon(icon) || ImageIcon;

  return (
    <div className="px-4">
      <motion.div
        className={`w-full ${aspectClass} bg-gradient-to-br from-gray-100 to-gray-200 ${
          rounded ? 'rounded-2xl' : ''
        } flex flex-col items-center justify-center gap-2 overflow-hidden`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <IconComponent size={32} className="text-gray-400" strokeWidth={1.5} />
        {label && (
          <span className="text-xs text-gray-400 font-medium">{label}</span>
        )}
      </motion.div>
    </div>
  );
}
