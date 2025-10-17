import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import logo from '../../assets/sda-logo.png';
import zion1 from '../../assets/zion-1.jpg';
import zion2 from '../../assets/zion-2.jpg';
import zion3 from '../../assets/zion-3.jpg';
import zion4 from '../../assets/zion-4.jpg';
import zion5 from '../../assets/zion-5.jpg';
import zion6 from '../../assets/zion-6.jpg';
import zionChoir from '../../assets/zion-choir.jpg';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();

  // SDA Fundamental Beliefs with Colors
  const sdaBeliefs = [
    {
      title: 'Sanctuary',
      color: 'bg-blue-800',
      gradient: 'from-blue-800 to-blue-600',
      verse: '"And let them make me a sanctuary; that I may dwell among them."',
      reference: 'Exodus 25:8'
    },
    {
      title: 'Remember the Sabbath',
      color: 'bg-emerald-700',
      gradient: 'from-emerald-700 to-emerald-500',
      verse: '"Remember the sabbath day, to keep it holy."',
      reference: 'Exodus 20:8'
    },
    {
      title: 'Gift of Prophecy',
      color: 'bg-yellow-500',
      gradient: 'from-yellow-500 to-yellow-400',
      verse: '"Surely the Sovereign LORD does nothing without revealing his plan to his servants the prophets."',
      reference: 'Amos 3:7'
    },
    {
      title: 'Conditional Immortality',
      color: 'bg-slate-700',
      gradient: 'from-slate-700 to-slate-600',
      verse: '"For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord."',
      reference: 'Romans 6:23'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-fixed"
      style={{
        backgroundImage: `url(${zionChoir})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Pillars removed */}
      
      {/* Darker overlay for stronger background shadow */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/60"></div>
      
      {/* Floating white particles */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Existing subtle particles */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/40 rounded-full animate-float" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/30 rounded-full animate-float" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-float" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white/35 rounded-full animate-float" style={{ animationDelay: '3s', animationDuration: '4.5s' }}></div>

        {/* Falling crosses layer - sparse and soft so it doesn't distract */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`cross-${i}`}
            className="cross-fall"
            style={{
              left: `${(i * 8) % 100}%`,
              animationDuration: `${6 + (i % 5)}s`,
              animationDelay: `${(i % 7) * 0.7}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
      
      {/* Login Form */}
      <div className="max-w-sm w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/30">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto w-16 h-16 mb-4">
              <img src={logo} alt="SDA Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Seventh-Day Adventist Church, Mt. Zion - Kigoma</h1>
            <p className="text-gray-600">Church Management System</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/80 backdrop-blur-sm"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/80 backdrop-blur-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

        </div>

        <div className="text-center mt-6 relative z-10">
          <p className="text-white/90 text-sm drop-shadow-lg backdrop-blur-sm">
            © 2025 Seventh-Day Adventist Church, Mt. Zion - Kigoma. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;