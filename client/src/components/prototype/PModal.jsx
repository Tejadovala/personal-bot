import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const variantStyles = {
  primary: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  destructive: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
};

export default function PModal({
  title,
  body,
  buttons = [],
  visible = true,
  on_close,
  onNavigate,
}) {
  const [isVisible, setIsVisible] = useState(visible);

  const handleClose = () => {
    setIsVisible(false);
    if (on_close && onNavigate) {
      onNavigate(on_close);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal content */}
          <motion.div
            className="relative z-10 bg-white rounded-t-3xl w-full mx-auto overflow-hidden shadow-2xl mt-auto"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Close button */}
            <button
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer transition-colors z-10"
              onClick={handleClose}
            >
              <X size={14} strokeWidth={2.5} />
            </button>

            <div className="px-5 pt-4 pb-8">
              {title && (
                <h3 className="text-lg font-bold text-gray-900 pr-8">{title}</h3>
              )}
              {body && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {body}
                </p>
              )}

              {buttons && buttons.length > 0 && (
                <div className="mt-5 space-y-2">
                  {buttons.map((btn, idx) => {
                    const style = variantStyles[btn.variant] || variantStyles.primary;
                    return (
                      <motion.button
                        key={idx}
                        className={`w-full py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all ${style}`}
                        onClick={() => {
                          if (btn.on_tap && onNavigate) {
                            onNavigate(btn.on_tap);
                          }
                          // Automatically close if there's no navigation, or if it explicitly says close
                          if (!btn.on_tap || btn.close) {
                            handleClose();
                          }
                        }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {btn.text}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
