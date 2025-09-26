import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/Auth.css';

const VerifySMS = () => {
  const navigate = useNavigate();
  const { verifySMS, pendingVerification, loading } = useAuth();

  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!pendingVerification) {
      navigate('/login');
      return;
    }
  }, [pendingVerification, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newCode = [...verificationCode];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    setVerificationCode(newCode);

    const nextEmptyIndex = newCode.findIndex(digit => !digit);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const code = verificationCode.join('');

    if (code.length !== 6) {
      setError('6桁すべて入力してください');
      return;
    }

    const result = await verifySMS(code);
    if (result.success) {
      // Navigate based on verification type
      if (result.type === 'register') {
        navigate('/login');
      } else {
        navigate('/map');
      }
    } else {
      setError(result.error || '無効な認証コードです');
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setVerificationCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();

    toast.info('認証コードを再送信しました！');
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const last4 = cleaned.slice(-4);
    return `•••• ${last4}`;
  };

  if (!pendingVerification) {
    return null;
  }

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="auth-header">
          <motion.div
            className="auth-logo"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            📱
          </motion.div>
          <h1>電話番号を認証</h1>
          <p>{formatPhoneNumber(pendingVerification?.phoneNumber)}に送信された6桁のコードを入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <motion.div
            className="verification-code-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="verification-inputs">
              {verificationCode.map((digit, index) => (
                <motion.input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`verification-input ${error ? 'error' : ''} ${digit ? 'filled' : ''}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  whileFocus={{ scale: 1.1 }}
                />
              ))}
            </div>
            {error && (
              <motion.span
                className="error-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.span>
            )}
          </motion.div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || verificationCode.join('').length !== 6}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {loading ? (
              <span className="btn-loading">
                <div className="spinner"></div>
                認証中...
              </span>
            ) : (
              '認証して継続'
            )}
          </motion.button>
        </form>

        <motion.div
          className="resend-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {canResend ? (
            <button
              type="button"
              className="resend-button"
              onClick={handleResend}
            >
              コードが届かない場合は？ <span className="resend-link">再送信</span>
            </button>
          ) : (
            <p className="resend-timer">
              <span className="timer-count">{resendTimer}秒</span>後にコードを再送信
            </p>
          )}
        </motion.div>

        <motion.div
          className="auth-footer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="back-button"
          >
            ← ログインに戻る
          </button>
        </motion.div>

        <motion.div
          className="auth-info"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <div className="info-item">
            <span className="info-icon">💡</span>
            <span>コードは10分で有効期限が切れます</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📧</span>
            <span>SMSメッセージを確認してください</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VerifySMS;