import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function PPricingTier({
  name,
  price,
  period = '',
  features = [],
  cta_text = 'Get Started',
  highlighted = false,
  on_tap,
  onNavigate,
}) {
  return (
    <div className="px-4">
      <motion.div
        className={`relative rounded-2xl overflow-hidden ${
          highlighted
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px]'
            : 'border border-gray-200'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div
          className={`rounded-[14px] p-5 ${
            highlighted ? 'bg-white' : 'bg-white'
          }`}
        >
          {highlighted && (
            <div className="inline-block px-2.5 py-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
              Popular
            </div>
          )}

          <h3
            className={`text-base font-semibold ${
              highlighted ? 'text-gray-900' : 'text-gray-700'
            }`}
          >
            {name}
          </h3>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{price}</span>
            {period && (
              <span className="text-sm text-gray-400 font-medium">{period}</span>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {(features || []).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${
                    highlighted
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </div>
                <span className="text-xs text-gray-600 leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <motion.button
            className={`w-full mt-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
              highlighted
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => on_tap && onNavigate && onNavigate(on_tap)}
            whileTap={{ scale: 0.97 }}
          >
            {cta_text}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
