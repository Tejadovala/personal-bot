import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers, ArrowLeft, Check, Sparkles, Zap, Crown,
  CreditCard, ExternalLink
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'Forever free',
    description: 'Perfect for trying out pdesign',
    features: [
      'Up to 2 active prototypes',
      'All 23+ component types',
      'Shareable public links',
      'Click-through navigation',
      '"Made with pdesign" watermark',
    ],
    limitations: [
      'Limited to 2 prototypes',
      'Watermark on shared links',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
    highlighted: false,
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professional designers',
    features: [
      'Unlimited prototypes',
      'All 23+ component types',
      'Shareable links — no watermark',
      'Click-through navigation',
      'Priority generation speed',
      'Custom subdomain',
      'Export prototype as PDF',
      'Priority support',
    ],
    limitations: [],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    highlighted: true,
    icon: <Crown className="w-5 h-5" />,
  },
];

export default function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = user?.plan || 'free';

  const handleUpgrade = async (planId) => {
    if (planId === 'free' || planId === currentPlan) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('pdesign_token');
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId: 'price_pro_monthly' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Mock mode — just show a message
        alert('Stripe is in test mode. In production, you would be redirected to Stripe Checkout.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-bold text-neutral-900">pdesign</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-neutral-950 mb-3">
            Plans & Billing
          </h1>
          <p className="text-neutral-500 max-w-md mx-auto">
            {currentPlan === 'pro'
              ? "You're on the Pro plan. Thank you for your support!"
              : 'Upgrade to unlock unlimited prototypes and remove watermarks.'}
          </p>
        </motion.div>

        {/* Current plan badge */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            currentPlan === 'pro'
              ? 'bg-accent-50 text-accent-700 border border-accent-200'
              : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
          }`}>
            {currentPlan === 'pro' ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            Current plan: {currentPlan === 'pro' ? 'Pro' : 'Free'}
          </div>
        </motion.div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-white border-2 border-accent-500 shadow-lg shadow-accent-500/10'
                  : 'bg-white border border-neutral-200'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-500 text-white text-xs font-semibold rounded-full">
                  Recommended
                </div>
              )}

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                plan.highlighted
                  ? 'bg-accent-100 text-accent-600'
                  : 'bg-neutral-100 text-neutral-500'
              }`}>
                {plan.icon}
              </div>

              <h3 className="text-lg font-bold text-neutral-900 mb-1">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold text-neutral-950">{plan.price}</span>
                {plan.period !== 'Forever free' && (
                  <span className="text-sm text-neutral-400">{plan.period}</span>
                )}
              </div>
              <p className="text-sm text-neutral-500 mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-neutral-600">
                    <Check className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.id === currentPlan || plan.ctaDisabled || isProcessing}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted && plan.id !== currentPlan
                    ? 'bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                } disabled:opacity-50`}
              >
                {plan.id === currentPlan ? '✓ Current Plan' : plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ / Info */}
        <motion.div
          className="mt-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-neutral-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: "Yes! You can cancel your Pro subscription at any time. You'll keep Pro access until the end of your billing period.",
              },
              {
                q: 'What happens to my prototypes if I downgrade?',
                a: "Your prototypes won't be deleted. You'll keep access to view them, but you won't be able to create new ones beyond the free tier limit of 2.",
              },
              {
                q: 'Do you offer annual billing?',
                a: 'Annual billing at a discounted rate is coming soon. Stay tuned!',
              },
            ].map((faq, i) => (
              <div key={i} className="p-5 rounded-xl bg-white border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
