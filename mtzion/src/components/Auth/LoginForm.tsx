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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* SDA Colors Grid Background */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 h-full">
        {sdaBeliefs.map((belief, index) => (
          <div key={index} className={`bg-gradient-to-br ${belief.gradient} relative overflow-hidden`}>
            {/* Animated overlay pattern */}
            <div className="absolute inset-0 opacity-10 animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/10 to-transparent"></div>
            </div>
            
            {/* Geometric pattern */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `
                  repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.1) 10deg, transparent 20deg),
                  linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)
                `,
                backgroundSize: '40px 40px, 100px 100px'
              }}
            ></div>
            
            {/* Content - Positioned in corners */}
            {index === 0 && (
              <div className="absolute top-4 left-4 max-w-xs hidden lg:block">
                <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">
                    {belief.title}
                  </h3>
                  <p className="text-white/90 text-sm font-light italic mb-2 leading-relaxed" 
                     style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {belief.verse}
                  </p>
                  <p className="text-white/80 text-xs font-medium"
                     style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {belief.reference}
                  </p>
                </div>
              </div>
            )}
            
            {index === 1 && (
              <div className="absolute top-4 right-4 max-w-xs hidden lg:block">
                <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">
                    {belief.title}
                  </h3>
                  <p className="text-white/90 text-sm font-light italic mb-2 leading-relaxed" 
                     style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {belief.verse}
                  </p>
                  <p className="text-white/80 text-xs font-medium"
                     style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {belief.reference}
                  </p>
                </div>
              </div>
            )}
            
            {index === 2 && (
              <div className="absolute bottom-4 left-4 max-w-xs hidden lg:block">
                <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <h3 className="text-gray-900 font-bold text-lg mb-2 drop-shadow-lg">
                    {belief.title}
                  </h3>
                  <p className="text-gray-800 text-sm font-light italic mb-3 leading-relaxed" 
                     style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                    {belief.verse}
                  </p>
                  <p className="text-gray-700 text-xs font-medium"
                     style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                    {belief.reference}
                  </p>
                </div>
              </div>
            )}
            
            {index === 3 && (
              <div className="absolute bottom-4 right-4 max-w-xs hidden lg:block">
                <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">
                    {belief.title}
                  </h3>
                  <p className="text-white/90 text-sm font-light italic mb-2 leading-relaxed" 
                     style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {belief.verse}
                  </p>
                  <p className="text-white/80 text-xs font-medium"
                     style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {belief.reference}
                  </p>
                </div>
              </div>
            )}
            
            {/* Decorative element */}
            <div className="absolute bottom-2 right-2 w-6 h-6 border-2 border-white/20 rounded-full animate-ping"></div>
          </div>
        ))}
      </div>
      
      {/* Subtle overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20"></div>
      
      {/* Floating white particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/40 rounded-full animate-float" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/30 rounded-full animate-float" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-float" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white/35 rounded-full animate-float" style={{ animationDelay: '3s', animationDuration: '4.5s' }}></div>
      </div>
      
      {/* Login Form */}
      <div className="max-w-sm w-full relative z-10">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/30">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto w-16 h-16 mb-4">
              <img src={logo} alt="SDA Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">SDA Mt. Zion</h1>
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
            © 2024 SDA Mt. Zion Church. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;