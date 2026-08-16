import { useState } from 'react';
import { motion } from 'framer-motion';
import { getIcon } from './iconMap';

export default function PChipGroup({
  chips = [],
  multiselect = false,
  onNavigate,
}) {
  const [selected, setSelected] = useState(() => {
    const initial = new Set();
    chips.forEach((chip, idx) => {
      if (chip.selected) initial.add(idx);
    });
    return initial;
  });

  const handleSelect = (idx, chip) => {
    setSelected((prev) => {
      const next = new Set(multiselect ? prev : []);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });

    if (chip.on_tap && onNavigate) {
      onNavigate(chip.on_tap);
    }
  };

  return (
    <motion.div
      className="px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, idx) => {
          const isSelected = selected.has(idx);
          const IconComponent = getIcon(chip.icon);

          return (
            <motion.button
              key={idx}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelect(idx, chip)}
              whileTap={{ scale: 0.93 }}
              layout
            >
              {IconComponent && (
                <IconComponent
                  size={13}
                  strokeWidth={2}
                  className={isSelected ? 'text-indigo-500' : 'text-gray-400'}
                />
              )}
              {chip.text}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
