import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaBuilding, FaUser, FaMapMarkerAlt, FaPhone, FaIdCard, FaUserTie } from 'react-icons/fa';
import { scrollIntoViewIfNeeded } from '../utils/scroll';
import InfoPopover from '../components/InfoPopover';
import '../styles/ProofOfId-premium.css';
import { ProofData } from '../context/ProofData';
import { countries, titles, genders } from '../data/referenceData';

interface ProofOfIdProps {
  value: ProofData;
  onUpdate: (data: ProofData) => void;
  setIsComplete: (complete: boolean) => void;
  onNext: (skipReview?: boolean) => void;
  editing?: boolean;
  hasChanges?: boolean;
}

const nonEmpty = (v: any) => !!(v && v.toString().trim());
const isEmail = (v: string) => /.+@.+\..+/.test(v.trim());
const isDOB = (v: string) => /^(\d{2})\/(\d{2})\/(\d{4})$/.test(v.trim());

const ProofOfId: React.FC<ProofOfIdProps> = ({
  value,
  onUpdate,
  setIsComplete,
  onNext,
  editing = false,
  hasChanges = false,
}) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [activeTeam, setActiveTeam] = useState<string[]>([]);
  const [currentQuestionInGroup, setCurrentQuestionInGroup] = useState(0);

  useEffect(() => {
    const prefill = (window as any).helixPrefillData;
    if (Array.isArray(prefill?.activeTeam)) setActiveTeam(prefill.activeTeam);
  }, []);

  interface Question {
    key: string;
    label: string;
    type: 'choice' | 'text' | 'select' | 'email' | 'dob' | 'nationality' | 'group';
    placeholder?: string;
    options?: { value: any; label: string }[];
    validate?: (v: any, full: ProofData) => boolean;
    afterChange?: (val: any, full: ProofData) => Partial<ProofData> | void;
    questions?: Question[]; // For grouped questions
  }

  interface QuestionGroup {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    questions: Question[];
    hidden?: (data: ProofData) => boolean;
  }

  const questionGroups: QuestionGroup[] = [
    {
      icon: FaIdCard,
      title: 'ID Confirmation',
      questions: [
        {
          key: 'idStatus',
          label: 'Are you providing ID for the first time or renewing?',
          type: 'choice',
          options: [
            { value: 'first-time', label: 'First-Time ID' },
            { value: 'renewing', label: 'Renewing ID' }
          ],
          validate: nonEmpty,
        },
        {
          key: 'isCompanyClient',
          label: 'Who are you proving identity for?',
          type: 'choice',
          options: [
            { value: false, label: 'For Myself' },
            { value: true, label: 'For a Company' }
          ],
          validate: v => v !== null && v !== undefined,
          afterChange: v => v ? {} : {
            companyName: '', companyNumber: '', companyHouseNumber: '',
            companyStreet: '', companyCity: '', companyCounty: '',
            companyPostcode: '', companyCountry: ''
          },
        },
      ],
    },
    {
      icon: FaBuilding,
      title: 'Company Details',
      hidden: (data) => !data.isCompanyClient,
      questions: [
        { key: 'companyName', label: 'Company Name', type: 'text', validate: nonEmpty },
        { key: 'companyNumber', label: 'Company Number', type: 'text', validate: nonEmpty },
        { key: 'companyAddress', label: 'Company Address', type: 'group', questions: [
          { key: 'companyHouseNumber', label: 'House/Building Number', type: 'text', placeholder: 'House/Building Number', validate: nonEmpty },
          { key: 'companyStreet', label: 'Street', type: 'text', placeholder: 'Street', validate: nonEmpty },
          { key: 'companyCity', label: 'City/Town', type: 'text', placeholder: 'City/Town', validate: nonEmpty },
          { key: 'companyCounty', label: 'County', type: 'text', placeholder: 'County', validate: nonEmpty },
          { key: 'companyPostcode', label: 'Postcode', type: 'text', placeholder: 'Post Code', validate: nonEmpty },
          { key: 'companyCountry', label: 'Country', type: 'select', validate: nonEmpty },
        ]},
      ],
    },
    {
      icon: FaUser,
      title: 'Personal Details',
      description: value.isCompanyClient ? 'Please use your personal details if you are a director of the company.' : undefined,
      questions: [
        { key: 'personalInfo', label: 'Personal Information', type: 'group', questions: [
          { key: 'title', label: 'Title', type: 'select', validate: nonEmpty },
          { key: 'firstName', label: 'First Name', type: 'text', placeholder: 'First Name', validate: nonEmpty },
          { key: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Last Name', validate: nonEmpty },
          { key: 'dob', label: 'Date of Birth', type: 'dob', placeholder: 'dd/mm/yyyy', validate: isDOB },
          { key: 'gender', label: 'Gender', type: 'select', validate: nonEmpty },
          { key: 'nationality', label: 'Nationality', type: 'nationality', validate: nonEmpty },
        ]},
      ],
    },
    {
      icon: FaMapMarkerAlt,
      title: 'Your Address',
      questions: [
        { key: 'address', label: 'Your Address', type: 'group', questions: [
          { key: 'houseNumber', label: 'House/Building Number', type: 'text', placeholder: 'House/Building Number', validate: nonEmpty },
          { key: 'street', label: 'Street', type: 'text', placeholder: 'Street', validate: nonEmpty },
          { key: 'city', label: 'City/Town', type: 'text', placeholder: 'City/Town', validate: nonEmpty },
          { key: 'county', label: 'County', type: 'text', placeholder: 'County', validate: nonEmpty },
          { key: 'postcode', label: 'Postcode', type: 'text', placeholder: 'Post Code', validate: nonEmpty },
          { key: 'country', label: 'Country', type: 'select', validate: nonEmpty },
        ]},
      ],
    },
    {
      icon: FaPhone,
      title: 'Contact Information',
      questions: [
        { key: 'contact', label: 'Contact Information', type: 'group', questions: [
          { key: 'phone', label: 'Best Phone Number', type: 'text', placeholder: 'Best Phone Number', validate: nonEmpty },
          { key: 'email', label: 'Best Email', type: 'email', placeholder: 'Best Email', validate: isEmail },
        ]},
      ],
    },
    {
      icon: FaIdCard,
      title: 'ID Details',
      questions: [
        {
          key: 'idType',
          label: 'Which form of ID are you providing?',
          type: 'choice',
          options: [
            { value: 'passport', label: 'Passport' },
            { value: 'driver-license', label: "Driver's License" }
          ],
          validate: nonEmpty,
          afterChange: () => ({ idNumber: '' }),
        },
        { 
          key: 'idNumber', 
          label: value.idType === 'passport' ? 'Passport Number' : 
                 value.idType === 'driver-license' ? 'Driver\'s License Number' : 
                 'ID Number', 
          type: 'text', 
          placeholder: value.idType === 'passport' ? 'Enter your passport number' :
                       value.idType === 'driver-license' ? 'Enter your driver\'s license number' :
                       'Enter your ID number',
          validate: nonEmpty 
        },
      ],
    },
    {
      icon: FaUserTie,
      title: 'Helix Contact',
      questions: [
        { key: 'helixContact', label: 'Person you have spoken to at Helix Law', type: 'select', validate: nonEmpty },
      ],
    },
  ];

  // Get visible groups and calculate totals
  const visibleGroups = questionGroups.filter(group => !(group.hidden && group.hidden(value)));

  // Create steps where each group is a single step/page
  const createSteps = (groups: QuestionGroup[]) => {
    const steps: any[] = [];
    groups.forEach(group => {
      // Each group becomes one step/page
      steps.push({
        type: 'groupPage',
        groupTitle: group.title,
        groupIcon: group.icon,
        questions: group.questions,
        description: group.description,
      });
    });
    return steps;
  };

  const steps = createSteps(visibleGroups);
  const currentStep = steps[currentQuestionInGroup];
  const totalSteps = steps.length;

  const updateField = useCallback((field: string, val: any) => {
    const next: any = { ...value, [field]: val };
    if (field === 'country') { const f = countries.find(c => c.name === val); next.countryCode = f?.code; }
    if (field === 'companyCountry') { const f = countries.find(c => c.name === val); next.companyCountryCode = f?.code; }
    if (field === 'nationality') { const f = countries.find(c => c.name === val); next.nationalityCode = f?.code; }
    if (field === 'dob') {
      const digits = val.replace(/\D/g, '').slice(0, 8);
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      let fmt = d;
      if (m) fmt += '/' + m;
      if (y) fmt += '/' + y;
      next.dob = fmt;
    }
    onUpdate(next);
    
    // Handle afterChange for the specific question
    if (currentStep?.type === 'groupPage') {
      // Look for the question in any nested structure
      let foundQuestion: Question | undefined;
      currentStep.questions.forEach((q: Question) => {
        if (q.key === field) {
          foundQuestion = q;
        } else if (q.type === 'group' && q.questions) {
          const nestedQ = q.questions.find((nq: Question) => nq.key === field);
          if (nestedQ) foundQuestion = nestedQ;
        }
      });
      if (foundQuestion?.afterChange) {
        const extra = foundQuestion.afterChange(val, next);
        if (extra) onUpdate({ ...next, ...extra });
      }
    } else if (currentStep?.type === 'single' && currentStep.question?.afterChange) {
      const extra = currentStep.question.afterChange(val, next);
      if (extra) onUpdate({ ...next, ...extra });
    } else if (currentStep?.type === 'group') {
      const question = currentStep.questions?.find((q: Question) => q.key === field);
      if (question?.afterChange) {
        const extra = question.afterChange(val, next);
        if (extra) onUpdate({ ...next, ...extra });
      }
    }
  }, [value, onUpdate, currentStep]);

  const isValid = useCallback(() => {
    if (!currentStep) return false;
    
    if (currentStep.type === 'groupPage') {
      // All questions in the group page must be valid
      const allQuestions: Question[] = [];
      
      currentStep.questions.forEach((q: Question) => {
        if (q.type === 'group' && q.questions) {
          allQuestions.push(...q.questions);
        } else {
          allQuestions.push(q);
        }
      });
      
      return allQuestions.every((q: Question) => {
        const v = (value as any)[q.key];
        return q.validate ? q.validate(v, value) : true;
      });
    } else if (currentStep.type === 'single') {
      const q = currentStep.question;
      const v = (value as any)[q.key];
      return q.validate ? q.validate(v, value) : true;
    } else if (currentStep.type === 'group') {
      // All questions in the group must be valid
      return currentStep.questions.every((q: Question) => {
        const v = (value as any)[q.key];
        return q.validate ? q.validate(v, value) : true;
      });
    }
    return false;
  }, [currentStep, value]);

  const goNext = useCallback(() => {
    if (!isValid()) return;
    
    if (currentQuestionInGroup < totalSteps - 1) {
      // Move to next step
      setCurrentQuestionInGroup(q => q + 1);
    } else {
      // Complete
      setIsComplete(true);
      onNext();
    }
  }, [isValid, currentQuestionInGroup, totalSteps, setIsComplete, onNext]);

  const goPrev = useCallback(() => {
    if (currentQuestionInGroup > 0) {
      // Go back to previous step
      setCurrentQuestionInGroup(q => q - 1);
    }
  }, [currentQuestionInGroup]);

  useEffect(() => {
    scrollIntoViewIfNeeded(formRef.current);
  }, [currentQuestionInGroup]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (isValid()) {
          e.preventDefault();
          goNext();
        }
      } else if (e.key === 'Escape') {
        goPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, isValid]);

  useEffect(() => {
    const isLastStep = currentQuestionInGroup === totalSteps - 1;
    setIsComplete(isLastStep && isValid());
  }, [currentQuestionInGroup, totalSteps, isValid, setIsComplete]);

  const renderInput = (question: Question) => {
    const val: any = (value as any)[question.key] ?? '';
    
    switch (question.type) {
      case 'choice':
        // Don't auto-advance for key identity questions to allow switching between options
        const shouldAutoAdvance = !['idStatus', 'isCompanyClient', 'idType'].includes(question.key);
        
        return (
          <div className="premium-choice-group" role="radiogroup" aria-label={question.label}>
            {question.options!.map(option => (
              <button
                type="button"
                key={String(option.value)}
                className={`premium-choice-button ${val === option.value ? 'active' : ''}`}
                onClick={() => {
                  updateField(question.key, option.value);
                  if (shouldAutoAdvance) {
                    setTimeout(() => goNext(), 150);
                  }
                }}
                aria-pressed={val === option.value}
                role="radio"
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      
      case 'select':
        if (question.key === 'title') {
          return (
            <select
              className={`premium-select ${val ? 'filled' : ''}`}
              value={val}
              onChange={e => updateField(question.key, e.target.value)}
            >
              <option value="">Select title</option>
              {titles.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          );
        }
        if (question.key === 'gender') {
          return (
            <select
              className={`premium-select ${val ? 'filled' : ''}`}
              value={val}
              onChange={e => updateField(question.key, e.target.value)}
            >
              <option value="">Select gender</option>
              {genders.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          );
        }
        if (question.key === 'helixContact') {
          const list = activeTeam.length > 0 ? ['Unsure', ...activeTeam] : ['Unsure', 'John Doe', 'Jane Smith'];
          return (
            <select
              className={`premium-select ${val ? 'filled' : ''}`}
              value={val}
              onChange={e => updateField(question.key, e.target.value)}
            >
              <option value="">Select contact</option>
              {list.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          );
        }
        if (question.key === 'companyCountry' || question.key === 'country') {
          return (
            <select
              className={`premium-select ${val ? 'filled' : ''}`}
              value={val}
              onChange={e => updateField(question.key, e.target.value)}
            >
              <option value="">Select country</option>
              {countries.map(c => (
                <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
              ))}
            </select>
          );
        }
        return null;
      
      case 'nationality':
        return (
          <select
            className={`premium-select ${val ? 'filled' : ''}`}
            value={val}
            onChange={e => updateField(question.key, e.target.value)}
          >
            <option value="">Select nationality</option>
            {countries.map(c => (
              <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
            ))}
          </select>
        );
      
      case 'dob':
        return (
          <input
            type="text"
            className={`premium-input ${val ? 'filled' : ''}`}
            value={val}
            placeholder={question.placeholder || 'dd/mm/yyyy'}
            onChange={e => updateField(question.key, e.target.value)}
            maxLength={10}
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            className={`premium-input ${val ? 'filled' : ''}`}
            value={val}
            placeholder={question.placeholder || 'you@example.com'}
            onChange={e => updateField(question.key, e.target.value)}
          />
        );
      
      default:
        return (
          <input
            type="text"
            className={`premium-input ${val ? 'filled' : ''}`}
            value={val}
            placeholder={question.placeholder || ''}
            onChange={e => updateField(question.key, e.target.value)}
          />
        );
    }
  };

  const renderGroupQuestions = (questions: Question[], groupTitle?: string) => {
    // Check if this is contact information to apply vertical stacking
    const isContactGroup = groupTitle === 'Contact Information' || 
                          questions.some(q => q.key === 'phone' || q.key === 'email');
    
    const containerClass = isContactGroup ? 'premium-form-stack' : 'premium-form-grid';
    
    return (
      <div className={containerClass}>
        {questions.map((question) => (
          <div key={question.key} className="premium-form-group">
            <label className="premium-form-label">
              {question.label}
            </label>
            {renderInput(question)}
          </div>
        ))}
      </div>
    );
  };

  if (!currentStep) {
    return <div>Loading...</div>;
  }

  const IconComponent = currentStep.groupIcon;

  return (
    <div className="premium-identity-container">
      <div className="premium-identity-card premium-fade-in">
        {/* Progress indicator */}
        <div className="premium-progress">
          <div className={`premium-progress-step ${currentQuestionInGroup + 1 <= 1 ? 'active' : ''}`}>
            {currentQuestionInGroup + 1}
          </div>
          <div className={`premium-progress-line ${currentQuestionInGroup > 0 ? 'completed' : ''}`} />
          <div className="premium-progress-step">
            {totalSteps}
          </div>
        </div>

        {/* Section with premium styling */}
        <div className="premium-section premium-slide-up">
          <div className="premium-section-header">
            <IconComponent className="premium-section-icon" />
            <h2 className="premium-section-title">{currentStep.groupTitle}</h2>
          </div>
          
          <div className="premium-section-content">
            {currentStep.description && (
              <div className="premium-question-description premium-scale-in">
                {currentStep.description}
              </div>
            )}
            
            <div className="premium-question-container">
              {currentStep.type === 'groupPage' && (
                <div className="premium-group-content">
                  {currentStep.questions.map((question: Question, index: number) => (
                    <div key={question.key || index} className="premium-question">
                      {question.type === 'group' && question.questions ? (
                        <div className="premium-subgroup">
                          <div className="premium-question-banner">
                            <h4 className="premium-question-label">{question.label}</h4>
                          </div>
                          {renderGroupQuestions(question.questions, currentStep.groupTitle)}
                        </div>
                      ) : (
                        <div className="premium-single-question">
                          <div className="premium-question-banner">
                            <div className="premium-question-label">
                              {question.label}
                              {question.key === 'idStatus' && (
                                <InfoPopover text="If this is your first time supplying ID choose First-Time." />
                              )}
                              {question.key === 'isCompanyClient' && (
                                <InfoPopover text="Choose company if you act for a business." />
                              )}
                              {question.key === 'idType' && (
                                <InfoPopover text="Choose one" />
                              )}
                            </div>
                          </div>
                          
                          <div className="premium-form-group">
                            {renderInput(question)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {currentStep.type === 'single' ? (
                <>
                  <div className="premium-question-banner">
                    <div className="premium-question-label">
                      {currentStep.question.label}
                      {currentStep.question.key === 'idStatus' && (
                        <InfoPopover text="If this is your first time supplying ID choose First-Time." />
                      )}
                      {currentStep.question.key === 'isCompanyClient' && (
                        <InfoPopover text="Choose company if you act for a business." />
                      )}
                      {currentStep.question.key === 'idType' && (
                        <InfoPopover text="Choose one" />
                      )}
                    </div>
                  </div>
                  
                  <div className="premium-form-group">
                    {renderInput(currentStep.question)}
                  </div>
                </>
              ) : currentStep.type === 'group' ? (
                renderGroupQuestions(currentStep.questions, currentStep.groupTitle)
              ) : null}
            </div>
          </div>
        </div>

        {/* Premium Navigation */}
        <div className="premium-navigation">
          {currentQuestionInGroup > 0 && (
            <button
              type="button"
              className="premium-button-secondary"
              onClick={goPrev}
              aria-label="Go back to previous step"
            >
              ← Back
            </button>
          )}
          
          {(currentStep.type !== 'single' || currentStep.question.type !== 'choice') && (
            <button
              type="button"
              className="premium-button"
              disabled={!isValid()}
              onClick={goNext}
              aria-label={
                currentQuestionInGroup === totalSteps - 1
                  ? "Complete identity proof"
                  : "Continue to next step"
              }
            >
              {currentQuestionInGroup === totalSteps - 1
                ? "Complete"
                : "Continue →"
              }
            </button>
          )}
        </div>

        {editing && hasChanges && (
          <div className="premium-trust-indicator">
            <span>✓</span>
            Editing – unsaved changes
          </div>
        )}
      </div>
    </div>
  );
};

export default ProofOfId;
