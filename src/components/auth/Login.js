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
      setError('Phone number is required');
      return;
    }
    
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    // Development mode: Create mock user and go directly to map
    const mockUser = {
      id: 'dev-user-' + Date.now(),
      name: 'Test User',
      phoneNumber: phoneNumber,
      gender: 'male',
      interests: 'Testing the app',
      profilePhoto: null,
      createdAt: new Date().toISOString()
    };

    const mockToken = 'dev-token-' + Date.now();
    localStorage.setItem('authToken', mockToken);

    // Update AuthContext state directly
    setUserDirectly(mockUser);

    toast.success('Development mode: Logged in successfully!');

    // Navigate to map page
    navigate('/map');

    /* Original production code:
    try {
      const result = await login(phoneNumber);
      if (result.success) {
        navigate('/verify-sms');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
    */
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
          <h1>Welcome Back</h1>
          <p>Enter your phone number to sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <label htmlFor="phoneNumber">Phone Number</label>
          <PhoneInput
            country={'us'}
            value={phoneNumber}
            onChange={handlePhoneChange}
            inputProps={{
              name: 'phoneNumber',
              id: 'phoneNumber',
              className: error ? 'error' : '',
              placeholder: 'Enter your phone number'
            }}
            containerClass="phone-input-container"
            buttonClass="flag-dropdown"
            dropdownClass="countrylistview countrylist countrylistview_xs"
            searchClass="search-box"
            enableSearch={true}
            searchPlaceholder="Search countries..."
            countryCodeEditable={false}
            preferredCountries={['us', 'gb', 'ca', 'au']}
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
                Sending Code...
              </span>
            ) : (
              'Send Verification Code'
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
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create Account
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
            <span>Secure SMS verification</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🚀</span>
            <span>Quick and easy login</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📱</span>
            <span>No passwords required</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;