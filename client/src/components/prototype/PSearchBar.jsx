import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function PSearchBar({
  placeholder = 'Search...',
  on_search,
  onNavigate,
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className="px-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div
        className={`flex items-center gap-2.5 bg-gray-100 rounded-xl px-3.5 py-2.5 transition-all duration-200 ${
          focused ? 'bg-white ring-2 ring-indigo-100 border border-indigo-300' : 'border border-transparent'
        }`}
      >
        <Search
          size={17}
          className={`shrink-0 transition-colors duration-200 ${
            focused ? 'text-indigo-500' : 'text-gray-400'
          }`}
          strokeWidth={2}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
        />
        {query && (
          <motion.button
            className="text-xs text-indigo-500 font-medium cursor-pointer shrink-0"
            onClick={() => setQuery('')}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            Clear
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
