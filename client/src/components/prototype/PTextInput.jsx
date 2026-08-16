import { useState } from 'react';
import { motion } from 'framer-motion';
import { getIcon } from './iconMap';

export default function PTextInput({
  label,
  placeholder = '',
  type = 'text',
  icon,
  value: defaultValue = '',
  onNavigate,
}) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const IconComponent = getIcon(icon);

  return (
    <motion.div
      className="px-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {label && (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`flex items-center gap-2.5 bg-gray-50 rounded-xl px-3.5 py-3 border transition-all duration-200 ${
          focused
            ? 'border-indigo-400 bg-white ring-2 ring-indigo-100'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {IconComponent && (
          <IconComponent
            size={18}
            className={`shrink-0 transition-colors duration-200 ${
              focused ? 'text-indigo-500' : 'text-gray-400'
            }`}
          />
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
        />
      </div>
    </motion.div>
  );
}
