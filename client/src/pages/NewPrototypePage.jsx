import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Layers, Wand2 } from 'lucide-react';
import usePrototypeStore from '../store/prototypeStore';

const examplePrompts = [
  'Onboarding flow for a fitness app: signup, goal selection, then a paywall',
  'E-commerce checkout flow: cart summary, shipping address, payment, confirmation',
  'Social media app: login, feed with posts, profile page, settings',
  'Food delivery app: restaurant list, menu, cart, order tracking',
  'SaaS dashboard: login, main dashboard with stats, settings, billing',
  'Travel booking app: search, results list, hotel details, booking confirmation',
];

export default function NewPrototypePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';

  const [prompt, setPrompt] = useState(initialPrompt);
  const { createPrototype, isGenerating, error, clearError } = usePrototypeStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    try {
      const proto = await createPrototype(prompt);
      navigate(`/editor/${proto.id}`);
    } catch (err) {
      // Error is set in the store
    }
  };

  const handleExampleClick = (example) => {
    setPrompt(example);
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-neutral-900">pdesign</span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-50 rounded-2xl mb-4">
              <Wand2 className="w-7 h-7 text-accent-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-950 mb-2">
              Describe your flow
            </h1>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Tell us about the product flow you want to prototype. Be as specific or vague as you want — we'll figure out the rest.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); clearError(); }}
                placeholder="Onboarding flow for a fitness app: signup, goal selection, then a paywall..."
                rows={4}
                className="w-full px-5 py-4 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 transition-all resize-none leading-relaxed"
                disabled={isGenerating}
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="w-full h-12 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating your prototype...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Prototype
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Generating state */}
          {isGenerating && (
            <motion.div
              className="mt-6 flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex gap-1 mb-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-accent-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.1,
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-400">
                Planning screens, generating content, wiring navigation...
              </p>
            </motion.div>
          )}

          {/* Example prompts */}
          {!isGenerating && (
            <div className="mt-8 pt-6 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Try an example
              </p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="px-3 py-1.5 bg-neutral-50 hover:bg-accent-50 border border-neutral-200 hover:border-accent-200 rounded-lg text-xs text-neutral-600 hover:text-accent-700 transition-all truncate max-w-[280px]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
