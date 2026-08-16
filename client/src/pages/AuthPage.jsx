import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, Mail, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [magicToken, setMagicToken] = useState(() => searchParams.get('token') || '');
  const [step, setStep] = useState(() => searchParams.get('token') ? 'verify' : 'email');
  const [devToken, setDevToken] = useState('');

  const { requestMagicLink, verifyToken, isLoading, error, clearError } = useAuthStore();

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const result = await requestMagicLink(email);
      // In dev mode, the API returns the token directly
      if (result.token) {
        setDevToken(result.token);
      }
      setStep('verify');
    } catch (err) {
      // Error is set in the store
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!magicToken.trim()) return;

    try {
      await verifyToken(magicToken);
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      // Error is set in the store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-neutral-900">pdesign</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg p-8">
          {step === 'email' && (
            <>
              <h1 className="text-2xl font-bold text-neutral-950 mb-2 text-center">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-neutral-500 text-center mb-8">
                {mode === 'signup'
                  ? 'Start creating prototypes in seconds'
                  : 'Enter your email to sign in'}
              </p>

              <form onSubmit={handleSubmitEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                      placeholder="you@company.com"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 transition-all"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                  className="text-sm text-neutral-500 hover:text-accent-600 transition-colors"
                >
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-accent-600" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-950 mb-2 text-center">
                Check your email
              </h1>
              <p className="text-sm text-neutral-500 text-center mb-2">
                We sent a magic link to <strong className="text-neutral-700">{email}</strong>
              </p>

              {devToken && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Dev Mode — Token:</p>
                  <code className="block text-xs text-amber-800 break-all select-all">{devToken}</code>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Paste your magic link token
                  </label>
                  <input
                    type="text"
                    value={magicToken}
                    onChange={(e) => { setMagicToken(e.target.value); clearError(); }}
                    placeholder="Paste token here..."
                    className="w-full h-11 px-4 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 transition-all font-mono"
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify & Sign In
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => { setStep('email'); clearError(); }}
                className="w-full mt-3 text-sm text-neutral-500 hover:text-neutral-700 transition-colors text-center"
              >
                ← Back to email
              </button>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-green-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-neutral-950 mb-2">You're in!</h2>
              <p className="text-sm text-neutral-500">Redirecting to your dashboard...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
