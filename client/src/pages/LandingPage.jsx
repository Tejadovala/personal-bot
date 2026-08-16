import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, Zap, Eye, Share2, Layers,
  MousePointerClick, MessageSquare, ChevronRight
} from 'lucide-react';
import { DEMO_FLOW } from '../../../shared/schema.js';

// Mini phone preview component for the hero
function MiniPhonePreview() {
  const [activeScreen, setActiveScreen] = useState(0);
  const screenNames = ['Welcome', 'Sign Up', 'Goals', 'Paywall', 'Dashboard'];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % screenNames.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="w-[280px] h-[560px] bg-white rounded-[36px] border-[6px] border-neutral-900 shadow-xl relative overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-neutral-900 rounded-b-2xl z-10" />
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-neutral-900 rounded-full z-10" />

        {/* Screen content */}
        <div className="w-full h-full pt-8 px-4 pb-6 flex flex-col items-center justify-center">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center w-full"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm font-semibold text-neutral-900 mb-1">
              {screenNames[activeScreen]}
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-neutral-100 rounded-lg w-full" />
              ))}
              <div className="h-10 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl mt-3" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Screen indicator dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {screenNames.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeScreen ? 'w-6 bg-accent-500' : 'w-1.5 bg-neutral-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Prompt to Prototype',
    description: 'Describe your flow in plain English. Get a clickable prototype in under 60 seconds.',
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: 'Fully Clickable',
    description: 'Every button, card, and link is wired up. Navigate through your prototype like a real app.',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Edit with Follow-ups',
    description: '"Make the paywall show 3 tiers" — tweak any screen without regenerating the whole flow.',
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: 'Pixel-Perfect Preview',
    description: 'Every prototype uses a polished component library. No AI slop — just clean, consistent UI.',
  },
  {
    icon: <Share2 className="w-5 h-5" />,
    title: 'Share Instantly',
    description: 'Generate a public link in one click. Send it to stakeholders or test with real users.',
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Before the Build',
    description: 'Validate your flow before handing off to development. The fast, disposable prototyping layer.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate(`/new?prompt=${encodeURIComponent(prompt)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900">pdesign</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-1.5"
            >
              Log in
            </Link>
            <Link
              to="/auth?mode=signup"
              className="text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: Copy */}
            <motion.div
              className="flex-1 max-w-xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Prototyping
              </div>

              <h1 className="text-5xl lg:text-6xl font-extrabold text-neutral-950 leading-[1.1] tracking-tight mb-6">
                From idea to
                <span className="bg-gradient-to-r from-accent-500 to-accent-700 bg-clip-text text-transparent"> clickable prototype </span>
                in 60 seconds
              </h1>

              <p className="text-lg text-neutral-500 leading-relaxed mb-8 max-w-lg">
                Describe your product flow in plain English. pdesign generates polished, clickable multi-screen prototypes you can share with anyone.
              </p>

              {/* Prompt input */}
              <form onSubmit={handleSubmit} className="relative mb-4">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Onboarding flow for a fitness app: signup, goals, paywall..."
                  className="w-full h-14 pl-5 pr-14 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 shadow-sm transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 rounded-xl flex items-center justify-center text-white shadow-sm transition-all hover:shadow-md"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-xs text-neutral-400">
                No signup required to try. Free tier includes 2 prototypes.
              </p>
            </motion.div>

            {/* Right: Phone preview */}
            <motion.div
              className="flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <MiniPhonePreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white border-t border-neutral-100">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-neutral-950 mb-4">
              Prototyping, reimagined
            </h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              Stop wireframing manually. Let AI handle the layout while you focus on the experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                className="p-6 rounded-2xl border border-neutral-100 hover:border-accent-200 bg-white hover:bg-accent-50/30 transition-all group cursor-default"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center mb-4 group-hover:bg-accent-100 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-24 px-6 bg-gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-neutral-950 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-neutral-500 mb-12">
              Start free. Upgrade when you need more.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free tier */}
            <motion.div
              className="p-8 rounded-2xl border border-neutral-200 bg-white text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-sm font-semibold text-neutral-500 mb-2">Free</div>
              <div className="text-3xl font-bold text-neutral-950 mb-1">$0</div>
              <div className="text-sm text-neutral-400 mb-6">Forever free</div>
              <ul className="space-y-3 mb-8">
                {['Up to 2 active prototypes', 'All component types', 'Shareable links', '"Made with pdesign" watermark'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                    <ChevronRight className="w-3.5 h-3.5 text-accent-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth?mode=signup"
                className="block text-center w-full py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Get Started
              </Link>
            </motion.div>

            {/* Pro tier */}
            <motion.div
              className="p-8 rounded-2xl border-2 border-accent-500 bg-white text-left relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="absolute -top-3 right-6 px-3 py-1 bg-accent-500 text-white text-xs font-semibold rounded-full">
                Popular
              </div>
              <div className="text-sm font-semibold text-accent-600 mb-2">Pro</div>
              <div className="text-3xl font-bold text-neutral-950 mb-1">$19<span className="text-lg font-medium text-neutral-400">/mo</span></div>
              <div className="text-sm text-neutral-400 mb-6">Billed monthly</div>
              <ul className="space-y-3 mb-8">
                {['Unlimited prototypes', 'No watermark', 'Custom subdomain', 'Priority generation', 'Export options'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                    <ChevronRight className="w-3.5 h-3.5 text-accent-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth?mode=signup"
                className="block text-center w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold hover:from-accent-600 hover:to-accent-700 transition-all shadow-sm"
              >
                Start Free Trial
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-accent-500 to-accent-700 rounded-md flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-neutral-700">pdesign</span>
          </div>
          <p className="text-xs text-neutral-400">
            © 2026 pdesign. Fast, disposable prototyping for designers.
          </p>
        </div>
      </footer>
    </div>
  );
}
