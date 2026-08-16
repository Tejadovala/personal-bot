import { useState } from 'react';
import { motion } from 'framer-motion';

export default function PToggle({ label, default_on = false, onNavigate }) {
  const [enabled, setEnabled] = useState(default_on);

  return (
    <div className="px-4">
      <div className="flex items-center justify-between py-2">
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
        <button
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
            enabled ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
          onClick={() => setEnabled(!enabled)}
        >
          <motion.span
            className="inline-block h-5.5 w-5.5 rounded-full bg-white shadow-md"
            animate={{
              x: enabled ? 22 : 3,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>
    </div>
  );
}
