import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    gender: '',
    address: ''
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (phone) => {
    setFormData(prev => ({ ...prev, phoneNumber: `+${phone}` }));
    if (errors.phoneNumber) {
      setErrors(prev => ({ ...prev, phoneNumber: '' }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (formData.phoneNumber.length < 9) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Please enter a complete address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) return;

    try {
      const result = await register(formData);
      if (result.success) {
        navigate('/verify-sms');
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.');
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

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } }
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
          <h1>Create Account</h1>
          <p>Join MatchApp and start connecting with people nearby</p>
        </div>

        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span>1</span>
            <label>Basic Info</label>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span>2</span>
            <label>Details</label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={errors.name ? 'error' : ''}
                  whileFocus="focus"
                  whileBlur="blur"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </motion.div>
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="phoneNumber">Phone Number</label>
                <PhoneInput
                  country={'us'}
                  value={formData.phoneNumber}
                  onChange={handlePhoneChange}
                  masks={{'us': '(..)-...-....'}}
                  inputProps={{
                    name: 'phoneNumber',
                    id: 'phoneNumber',
                    className: errors.phoneNumber ? 'error' : '',
                    placeholder: 'Enter your phone number'
                  }}
                  containerClass="phone-input-container"
                  buttonClass="flag-dropdown"
                  dropdownClass="countrylistview countrylist countrylistview_xs"
                  enableSearch={true}
                  countryCodeEditable={false}
                  preferredCountries={['us', 'gb', 'ca', 'au']}
                  disableSearchIcon={true}
                />
                {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
              </motion.div>

              <motion.button
                type="button"
                onClick={handleNext}
                className="btn btn-primary btn-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                Next Step
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="gender">
                  <span style={{ marginRight: '6px' }}>👤</span>
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={errors.gender ? 'error' : ''}
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <span className="error-message">{errors.gender}</span>}
              </motion.div>

              <motion.div className="form-group" variants={inputVariants}>
                <label htmlFor="address">
                  <span style={{ marginRight: '6px' }}>📍</span>
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address"
                  className={errors.address ? 'error' : ''}
                  maxLength="100"
                  whileFocus="focus"
                  whileBlur="blur"
                />
                {errors.address && <span className="error-message">{errors.address}</span>}
              </motion.div>

              <div className="form-actions">
                {/* <motion.button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back
                </motion.button> */}
                <motion.button
                  type="submit"
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;