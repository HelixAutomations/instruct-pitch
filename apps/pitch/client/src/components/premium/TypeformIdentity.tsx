import React, { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import './TypeformIdentity.css';

interface TypeformField {
  id: string;
  type: 'text' | 'select' | 'date' | 'email' | 'tel';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  validation?: (value: string) => string | null;
}

interface TypeformIdentityProps {
  onComplete: (data: Record<string, string>) => void;
  onNext: () => void;
}

// Define our fields with typeform-style progression
const identityFields: TypeformField[] = [
  {
    id: 'title',
    type: 'select',
    label: 'What should we call you?',
    placeholder: 'Select your title',
    options: [
      { value: 'Mr', label: 'Mr' },
      { value: 'Mrs', label: 'Mrs' },
      { value: 'Ms', label: 'Ms' },
      { value: 'Miss', label: 'Miss' },
      { value: 'Dr', label: 'Dr' },
      { value: 'Prof', label: 'Prof' },
      { value: 'Sir', label: 'Sir' },
      { value: 'Lady', label: 'Lady' },
    ],
    required: true
  },
  {
    id: 'firstName',
    type: 'text',
    label: 'What\'s your first name?',
    placeholder: 'Enter your first name',
    required: true,
    validation: (value) => value.length < 2 ? 'Please enter a valid first name' : null
  },
  {
    id: 'lastName',
    type: 'text',
    label: 'And your last name?',
    placeholder: 'Enter your last name',
    required: true,
    validation: (value) => value.length < 2 ? 'Please enter a valid last name' : null
  },
  {
    id: 'dateOfBirth',
    type: 'date',
    label: 'When were you born?',
    placeholder: 'DD/MM/YYYY',
    required: true,
    validation: (value) => {
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age < 18 ? 'You must be 18 or older' : null;
    }
  },
  {
    id: 'nationality',
    type: 'select',
    label: 'What\'s your nationality?',
    placeholder: 'Select your nationality',
    options: [
      { value: 'United Kingdom', label: 'United Kingdom (GB)' },
      { value: 'United States', label: 'United States (US)' },
      { value: 'Ireland', label: 'Ireland (IE)' },
      { value: 'Canada', label: 'Canada (CA)' },
      { value: 'Australia', label: 'Australia (AU)' },
      { value: 'Germany', label: 'Germany (DE)' },
      { value: 'France', label: 'France (FR)' },
      { value: 'Other', label: 'Other' }
    ],
    required: true
  },
  {
    id: 'email',
    type: 'email',
    label: 'What\'s your email address?',
    placeholder: 'your.email@example.com',
    required: true,
    validation: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value) ? 'Please enter a valid email address' : null;
    }
  }
];

const TypeformIdentity: React.FC<TypeformIdentityProps> = ({ onComplete, onNext }) => {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [currentValue, setCurrentValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentField = identityFields[currentFieldIndex];
  const isLastField = currentFieldIndex === identityFields.length - 1;
  const progress = ((currentFieldIndex + 1) / identityFields.length) * 100;

  // Auto-advance for select fields
  useEffect(() => {
    if (currentField?.type === 'select' && currentValue && !error) {
      const timer = setTimeout(() => {
        handleNext();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentValue, error, currentField]);

  const validateField = (value: string): string | null => {
    if (currentField.required && !value.trim()) {
      return 'This field is required';
    }
    
    if (currentField.validation) {
      return currentField.validation(value);
    }
    
    return null;
  };

  const handleNext = () => {
    const validationError = validateField(currentValue);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsTransitioning(true);

    // Save the current value
    const newFormData = { ...formData, [currentField.id]: currentValue };
    setFormData(newFormData);

    setTimeout(() => {
      if (isLastField) {
        onComplete(newFormData);
        onNext();
      } else {
        setCurrentFieldIndex(prev => prev + 1);
        setCurrentValue('');
        setIsTransitioning(false);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentFieldIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentFieldIndex(prev => prev - 1);
        const previousField = identityFields[currentFieldIndex - 1];
        setCurrentValue(formData[previousField.id] || '');
        setError(null);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentField.type !== 'select') {
      e.preventDefault();
      handleNext();
    }
  };

  const renderField = () => {
    switch (currentField.type) {
      case 'select':
        return (
          <div className="typeform-select-container">
            {currentField.options?.map((option, index) => (
              <button
                key={option.value}
                className={`typeform-option ${currentValue === option.value ? 'selected' : ''}`}
                onClick={() => setCurrentValue(option.value)}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option.label}</span>
                {currentValue === option.value && <FaCheck className="option-check" />}
              </button>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            className="typeform-input"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentField.placeholder}
            autoFocus
          />
        );

      default:
        return (
          <input
            type={currentField.type}
            className="typeform-input"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentField.placeholder}
            autoFocus
          />
        );
    }
  };

  return (
    <div className="typeform-container">
      {/* Progress Bar */}
      <div className="typeform-progress">
        <div className="progress-track">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">
          {currentFieldIndex + 1} of {identityFields.length}
        </span>
      </div>

      {/* Main Content */}
      <div className={`typeform-content ${isTransitioning ? 'transitioning' : ''}`}>
        <div className="typeform-header">
          <div className="field-number">{currentFieldIndex + 1}</div>
          <h1 className="typeform-question">{currentField.label}</h1>
          {currentField.required && (
            <span className="required-indicator">*</span>
          )}
        </div>

        <div className="typeform-field">
          {renderField()}
        </div>

        {error && (
          <div className="typeform-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="typeform-instructions">
          {currentField.type === 'select' ? (
            <p>Click your answer or press the letter key</p>
          ) : (
            <p>Press <kbd>Enter ↵</kbd> to continue</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="typeform-navigation">
        {currentFieldIndex > 0 && (
          <button 
            className="nav-button back-button"
            onClick={handleBack}
          >
            ← Back
          </button>
        )}
        
        {currentField.type !== 'select' && (
          <button 
            className="nav-button next-button"
            onClick={handleNext}
            disabled={!currentValue || !!error}
          >
            {isLastField ? 'Complete' : 'Next'} →
          </button>
        )}
      </div>

      {/* Background Animation */}
      <div className="typeform-background">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
    </div>
  );
};

export default TypeformIdentity;
