import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/Auth.css';

const SMSVerification = () => {
  const navigate = useNavigate();
  const { verifySMS, pendingVerification, loading } = useAuth();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!pendingVerification) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingVerification, navigate]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else if (value.match(/^\d?$/)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
    
    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setCode(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    // Development mode: Accept any 6-digit code and create mock user
    if (verificationCode) {
      const mockUser = {
        id: 'dev-user-123',
        name: 'Test User',
        phoneNumber: pendingVerification?.phoneNumber || '+1234567890',
        gender: 'male',
        interests: 'Testing the app',
        profilePhoto: null,
        createdAt: new Date().toISOString()
      };

      const mockToken = 'dev-token-' + Date.now();
      localStorage.setItem('authToken', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      toast.success('Development mode: Logged in successfully!');
      window.location.href = '/map';
      return;
    }

    /* Original code - uncomment for production
    try {
      const result = await verifySMS(verificationCode);
      if (result.success) {
        toast.success('Phone verified successfully!');
        navigate('/map');
      } else {
        setError(result.error || 'Verification failed');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    }
    */
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    toast.info('Resend functionality would be implemented here');
    setResendTimer(60);
    setCanResend(false);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (!pendingVerification) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const codeInputVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: i * 0.1, duration: 0.3 }
    }),
    focus: { scale: 1.1, borderColor: "#667eea" },
    blur: { scale: 1 }
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card verification-card"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="auth-header">
          <motion.div 
            className="auth-logo"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
          >
            📱
          </motion.div>
          <h1>Verify Your Phone</h1>
          <p>
            We've sent a 6-digit code to<br />
            <strong>{formatPhoneNumber(pendingVerification.phoneNumber)}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="code-input-group">
            {code.map((digit, index) => (
              <motion.input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`code-input ${error ? 'error' : ''} ${digit ? 'filled' : ''}`}
                variants={codeInputVariants}
                initial="hidden"
                animate="visible"
                whileFocus="focus"
                whileBlur="blur"
                custom={index}
                autoFocus={index === 0}
              />
            ))}
          </div>
          
          {error && (
            <motion.span 
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.span>
          )}

          <motion.button
            type="submit"
            className="btn btn-primary btn-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || code.join('').length !== 6}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {loading ? (
              <span className="btn-loading">
                <div className="spinner"></div>
                Verifying...
              </span>
            ) : (
              'Verify Code'
            )}
          </motion.button>
        </form>

        <motion.div 
          className="resend-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          {canResend ? (
            <button 
              type="button" 
              onClick={handleResend}
              className="resend-btn"
            >
              Resend Code
            </button>
          ) : (
            <p className="resend-timer">
              Resend code in <span className="timer-count">{resendTimer}s</span>
            </p>
          )}
        </motion.div>

        <motion.div 
          className="verification-tips"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <h4>Didn't receive the code?</h4>
          <ul>
            <li>Check your SMS messages</li>
            <li>Make sure you have signal</li>
            <li>Wait a few minutes for delivery</li>
            <li>Check spam folder if using email</li>
          </ul>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => navigate('/login')}
          className="back-btn"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.4 }}
        >
          ← Change Phone Number
        </motion.button>
      </motion.div>
    </div>
  );
};

export default SMSVerification;