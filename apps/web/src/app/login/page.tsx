'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Save API key to localStorage for future requests
      localStorage.setItem('apiToken', data.user.apiKey);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      router.push('/');
    } catch (error: any) {
      alert('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #FFFBF0 0%, #F8F9FA 50%, #FFF9E6 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '448px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(235, 237, 239, 0.5)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#000',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>C</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#000' }}>CRM</span>
          </div>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1F2933', marginBottom: '8px' }}>
          Sign in
        </h1>
        <p style={{ fontSize: '14px', color: '#8993A4', marginBottom: '32px' }}>
          Enter your credentials to access your account
        </p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#505F79', marginBottom: '8px' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              placeholder="amélielaurent7622@gmail.com"
              onFocus={(e) => e.target.style.borderColor = '#FFD666'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              required
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#505F79', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '44px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                placeholder="Enter your password"
                onFocus={(e) => e.target.style.borderColor = '#FFD666'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: '#FFD666',
              color: '#000',
              fontWeight: '600',
              fontSize: '16px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(255, 214, 102, 0.3)'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#8993A4' }}>
          Don't have an account?{' '}
          <a href="#" style={{ color: '#FFD666', fontWeight: '600', textDecoration: 'none' }}>
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
