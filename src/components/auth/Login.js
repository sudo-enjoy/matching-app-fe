import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, setUserDirectly } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const handlePhoneChange = (phone) => {
    setPhoneNumber(`+${phone}`);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phoneNumber) {
      setError('電話番号が必要です');
      return;
    }

    if (phoneNumber.length < 9) {
      setError('有効な電話番号を入力してください');
      return;
    }

    try {
      const result = await login(phoneNumber);
      if (result.success) {
        navigate('/verify-sms');
      }
    } catch (error) {
      toast.error('ログインに失敗しました。もう一度お試しください。');
    }

  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

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
            animate={{ rotate: 360 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            📍
          </motion.div>
          <h1>お帰りなさい</h1>
          <p>サインインするには電話番号を入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <motion.div
            className="form-group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <label htmlFor="phoneNumber">電話番号</label>
            <PhoneInput
              country={'jp'}
              value={phoneNumber}
              onChange={handlePhoneChange}
              masks={{
                'jp': '...-....-....',  // Japan: XXX-XXXX-XXXX
                'us': '(...) ...-....',  // USA: (XXX) XXX-XXXX
                'gb': '.... ......',      // UK: XXXX XXXXXX
                'ca': '(...) ...-....',  // Canada: (XXX) XXX-XXXX
                'au': '.... ... ...',     // Australia: XXXX XXX XXX
                'kr': '...-....-....',   // South Korea: XXX-XXXX-XXXX
                'cn': '... .... ....',    // China: XXX XXXX XXXX
                'in': '.....-......',     // India: XXXXX-XXXXXX
                'de': '.... ........',    // Germany: XXXX XXXXXXXX
                'fr': '. .. .. .. ..',    // France: X XX XX XX XX
                'it': '... ... ....',     // Italy: XXX XXX XXXX
                'es': '... .. .. ..',     // Spain: XXX XX XX XX
                'br': '(..) .....-....', // Brazil: (XX) XXXXX-XXXX
                'mx': '.. .... ....',     // Mexico: XX XXXX XXXX
                'ru': '(...) ...-..-..'   // Russia: (XXX) XXX-XX-XX
              }}
              inputProps={{
                name: 'phoneNumber',
                id: 'phoneNumber',
                className: error ? 'error' : '',
                placeholder: '電話番号を入力してください'
              }}
              containerClass="phone-input-container"
              buttonClass="flag-dropdown"
              dropdownClass="countrylistview countrylist countrylistview_xs"
              searchClass="search-box"
              enableSearch={true}
              searchPlaceholder="国を検索..."
              countryCodeEditable={false}
              preferredCountries={['jp', 'us', 'gb', 'ca', 'kr', 'cn']}
              disableSearchIcon={true}
            />
            {error && <span className="error-message">{error}</span>}
          </motion.div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            {loading ? (
              <span className="btn-loading">
                <div className="spinner"></div>
                コード送信中...
              </span>
            ) : (
              '認証コードを送信'
            )}
          </motion.button>
        </form>

        {/* <motion.div 
          className="auth-divider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <span>or</span>
        </motion.div> */}

        <motion.div
          className="auth-footer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <p>
            アカウントをお持ちではありませんか？{' '}
            <Link to="/register" className="auth-link">
              アカウント作成
            </Link>
          </p>
        </motion.div>

        <motion.div
          className="auth-info"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span>安全なSMS認証</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🚀</span>
            <span>簡単で迅速なログイン</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📱</span>
            <span>パスワード不要</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;