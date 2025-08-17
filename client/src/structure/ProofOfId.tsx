import React, { useState, useEffect, useRef } from 'react';
import { scrollIntoViewIfNeeded } from '../utils/scroll';
import { FaUser, FaCity, FaMapMarkerAlt, FaPhone, FaUserTie, FaChevronDown } from 'react-icons/fa';
import InfoPopover from '../components/InfoPopover';
import '../styles/ProofOfId.css';
import { ProofData } from '../context/ProofData';
import { countries, titles, genders } from '../data/referenceData';

interface ProofOfIdProps {
  value: ProofData;
  onUpdate: (data: ProofData) => void;
  setIsComplete: (complete: boolean) => void;
  onNext: (skipReview?: boolean) => void;
  editing?: boolean;
  hasChanges?: boolean;
  /** Which internal step to start on when mounted */
  startStep?: number;
}

// Define the type for individual section states
interface SectionState {
  collapsed: boolean;
  completed: boolean;
}

// Define the type for the entire sectionStates object
interface SectionStates {
  companyDetails: SectionState;
  companyAddress: SectionState;
  personalDetails: SectionState;
  addressDetails: SectionState;
  contactDetails: SectionState;
  idDetails: SectionState;
  helixContact: SectionState;
}

// All fields that must be completed before the entire company section collapses
const COMPANY_SECTION_FIELDS = [
  'companyName',
  'companyNumber',
  'companyHouseNumber',
  'companyStreet',
  'companyCity',
  'companyCounty',
  'companyPostcode',
  'companyCountry',
];

const ProofOfId: React.FC<ProofOfIdProps> = ({
  value,
  onUpdate,
  setIsComplete,
  onNext,
  editing = false,
  hasChanges = false,
  startStep = 1,
}) => {
  const [step, setStep] = useState<number>(startStep);
  const formRef = useRef<HTMLDivElement>(null);
  const idStatus = value.idStatus || '';
  const isCompanyClient = value.isCompanyClient ?? null;
  const idType = value.idType || null;

  const [activeTeam, setActiveTeam] = useState<string[]>([]);

  useEffect(() => {
    const prefill = (window as any).helixPrefillData;
    if (Array.isArray(prefill?.activeTeam)) {
      setActiveTeam(prefill.activeTeam);
    }
  }, []);

  // State to track collapsed and completed status for each section
  const [sectionStates, setSectionStates] = useState<SectionStates>({
    companyDetails: { collapsed: false, completed: false },
    companyAddress: { collapsed: false, completed: false },
    personalDetails: { collapsed: false, completed: false },
    addressDetails: { collapsed: false, completed: false },
    contactDetails: { collapsed: false, completed: false },
    idDetails: { collapsed: false, completed: false },
    helixContact: { collapsed: false, completed: false },
  });

  // Reset step when parent specifies a new starting step
  useEffect(() => {
    setStep(startStep);
  }, [startStep]);

  // Scroll to the top whenever the internal step changes
  useEffect(() => {
    scrollIntoViewIfNeeded(formRef.current);
  }, [step]);


  // Ensure the start of the form remains in view on step change
  // without forcing the entire window back to the top
  // (which caused the page to jump away from the form).

  // Effect to keep section completion in sync when fields are cleared
  // Once a section is marked complete via blur, it stays complete
  // until one of its required fields becomes empty again.
  useEffect(() => {
    const sections: { key: keyof SectionStates; fields: string[] }[] = [
      { key: 'companyDetails', fields: COMPANY_SECTION_FIELDS },
      {
        key: 'companyAddress',
        fields: [
          'companyHouseNumber',
          'companyStreet',
          'companyCity',
          'companyCounty',
          'companyPostcode',
          'companyCountry',
        ],
      },
      {
        key: 'personalDetails',
        fields: ['title', 'firstName', 'lastName', 'dob', 'gender', 'nationality'],
      },
      {
        key: 'addressDetails',
        fields: ['houseNumber', 'street', 'city', 'county', 'postcode', 'country'],
      },
      { key: 'contactDetails', fields: ['phone', 'email'] },
      { key: 'idDetails', fields: ['idNumber'] },
      { key: 'helixContact', fields: ['helixContact'] },
    ];

    setSectionStates(prev => {
      let changed = false;
      const updated = { ...prev };
      sections.forEach(({ key, fields }) => {
        const allFilled = checkSectionCompletion(fields);
        if (!allFilled && updated[key].completed) {
          updated[key] = { ...updated[key], completed: false };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [value, idType]); // Re-run when value or idType changes

  // Function to check if all fields in a section are filled
  const checkSectionCompletion = (sectionFields: string[]) => {
    return sectionFields.every((field) => {
      const fieldValue = value[field as keyof ProofData];
      return fieldValue && fieldValue.toString().trim() !== '';
    });
  };

  // Function to handle blur event and collapse section if all fields are filled
  const handleBlur = (
    sectionKey: keyof SectionStates,
    sectionFields: string[]
  ) => {
    const isCompleted = checkSectionCompletion(sectionFields);
    if (isCompleted) {
      setSectionStates((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          // Mark the section as completed without collapsing automatically
          completed: true,
        },
      }));
    }
  };

  // Function to toggle section collapse state
  const toggleSection = (sectionKey: keyof SectionStates) => {
    setSectionStates((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        collapsed: !prev[sectionKey].collapsed,
      },
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      value.title,
      value.firstName,
      value.lastName,
      value.nationality,
      value.houseNumber,
      value.street,
      value.city,
      value.county,
      value.postcode,
      value.country,
      value.dob,
      value.gender,
      value.phone,
      value.email,
      value.idNumber,
      value.helixContact,
      idType,
    ];
    const companyFields = isCompanyClient
      ? [
          value.companyName,
          value.companyNumber,
          value.companyHouseNumber,
          value.companyStreet,
          value.companyCity,
          value.companyCounty,
          value.companyPostcode,
          value.companyCountry,
        ]
      : [];
    return [...requiredFields, ...companyFields].every((field) => field && field.trim() !== '');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value: inputValue } = e.target;
    let newValue = inputValue;
    const updatedData: any = { ...value, [id]: inputValue, idStatus, isCompanyClient, idType };

    if (id === 'dob') {
      const digits = inputValue.replace(/\D/g, '').slice(0, 8);
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      if (digits.length >= 2) {
        newValue = day + '/';
      } else {
        newValue = day;
      }
      if (month) {
        newValue += month;
        if (digits.length >= 4) newValue += '/';
      }
      if (year) newValue += year;
      updatedData.dob = newValue;
    }

    if (id === 'country') {
      const found = countries.find(c => c.name === inputValue);
      updatedData.countryCode = found?.code;
    }

    if (id === 'companyCountry') {
      const found = countries.find(c => c.name === inputValue);
      updatedData.companyCountryCode = found?.code;
    }

    if (id === 'nationality') {
      const found = countries.find(c => c.name === inputValue);
      updatedData.nationalityCode = found?.code;
    }

    onUpdate(updatedData);
  };

  const handleIdStatusChange = (status: string) => {
    const updatedData = { ...value, idStatus: status };
    onUpdate(updatedData);
  };

  const handleCompanyClientChange = (val: boolean) => {
    const updatedData = { ...value, isCompanyClient: val };
    onUpdate(updatedData);
  };

  const handleIdTypeChange = (type: string) => {
    const updatedData = { ...value, idType: type, idNumber: '' };
    onUpdate(updatedData);
    // Auto-expand the section when picking an ID type
    setSectionStates((prev) => ({
      ...prev,
      idDetails: { ...prev.idDetails, collapsed: false },
    }));
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setIsComplete(true);
    } else {
      setIsComplete(false);
    }
    if (editing && !hasChanges) {
      onNext(true);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const validateBasicDetails = () => {
    const baseFields = [
      value.title,
      value.firstName,
      value.lastName,
      value.nationality,
      value.houseNumber,
      value.street,
      value.city,
      value.county,
      value.postcode,
      value.country,
      value.dob,
      value.gender,
      value.phone,
      value.email,
    ];
    const companyFields = isCompanyClient
      ? [
          value.companyName,
          value.companyNumber,
          value.companyHouseNumber,
          value.companyStreet,
          value.companyCity,
          value.companyCounty,
          value.companyPostcode,
          value.companyCountry,
        ]
      : [];
    return [...baseFields, ...companyFields].every(
      (field) => field && field.toString().trim() !== ''
    );
  };

  return (
    <div className="form-container apple-form" ref={formRef}>
      {step === 1 && (
        <>
          {/* BOTH Step 1 questions, always visible */}
          <div className="form-group step1-centered question-container">
            <label id="id-status-label" className="question-banner">
              Are you providing ID for the first time or have you been asked to renew ID?
              <InfoPopover text="Select 'First-Time ID' if this is your initial identity proof. Choose 'Renewing ID' if you are updating an existing ID." />
            </label>
            <div className="modern-toggle-group" role="radiogroup" aria-labelledby="id-status-label">
              <button
                type="button"
                className={`modern-toggle-button ${idStatus === 'first-time' ? 'active' : ''}`}
                onClick={() => handleIdStatusChange('first-time')}
              >
                First-Time ID
              </button>
              <button
                type="button"
                className={`modern-toggle-button ${idStatus === 'renewing' ? 'active' : ''}`}
                onClick={() => handleIdStatusChange('renewing')}
              >
                Renewing ID
              </button>
            </div>
          </div>

          <hr className="step1-separator" />

          <div className="form-group step1-centered question-container">
            <label id="company-client-label" className="question-banner">
              Who are you proving identity for?
              <InfoPopover text="Select 'For Myself' if you are proving your own identity. Choose 'For a Company' if you are acting on behalf of a business." />
            </label>
            <div className="modern-toggle-group" role="radiogroup" aria-labelledby="company-client-label">
              <button
                type="button"
                className={`modern-toggle-button ${isCompanyClient === false ? 'active' : ''}`}
                onClick={() => handleCompanyClientChange(false)}
              >
                <FaUser className="button-icon" />
                For Myself
              </button>
              <button
                type="button"
                className={`modern-toggle-button ${isCompanyClient === true ? 'active' : ''}`}
                onClick={() => handleCompanyClientChange(true)}
              >
                <FaCity className="button-icon" />
                For a Company
              </button>
            </div>
          </div>

          {/* Next button at bottom */}
          <div className="button-group">
            <button
              type="button"
              className="btn primary"
              disabled={!(idStatus && isCompanyClient !== null)}
              onClick={() => setStep(2)}
              aria-label="Proceed to next step"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="form-content">
          {isCompanyClient && (
            <>
              <div
                className={`form-group-section ${sectionStates.companyDetails.collapsed ? 'collapsed' : ''} ${sectionStates.companyDetails.completed ? 'completed' : ''}`}
              >
                <div className="group-header" onClick={() => toggleSection('companyDetails')}>
                  <FaCity className="section-icon" />
                  <span>Company Details</span>
                  {sectionStates.companyDetails.completed &&
                    sectionStates.companyDetails.collapsed && (
                    <span className="completion-tick visible">
                      <svg viewBox="0 0 24 24">
                        <polyline
                          points="5,13 10,18 19,7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                  <FaChevronDown
                    className={`dropdown-icon ${sectionStates.companyDetails.collapsed ? 'collapsed' : ''}`}
                  />
                </div>
                <hr className="section-divider" />
                <div
                  className={`collapsible-content ${sectionStates.companyDetails.collapsed ? 'collapsed' : ''}`}
                >
                  <div className="form-grid two-col-grid">
                    <div className="form-group">
                      <input
                        type="text"
                        id="companyName"
                        className={`paper-input ${value.companyName ? 'filled' : ''}`}
                        value={value.companyName}
                        onChange={handleInputChange}
                        placeholder="Company Name"
                        onBlur={() =>
                          handleBlur('companyDetails', COMPANY_SECTION_FIELDS)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        id="companyNumber"
                        className={`paper-input ${value.companyNumber ? 'filled' : ''}`}
                        value={value.companyNumber}
                        onChange={handleInputChange}
                        placeholder="Company Number"
                        onBlur={() =>
                          handleBlur('companyDetails', COMPANY_SECTION_FIELDS)
                        }
                      />
                    </div>
                  </div>
                  <div className="form-section address-section">
                    <div
                      className="group-header"
                      onClick={() => toggleSection('companyAddress')}
                    >
                      <FaMapMarkerAlt className="section-icon" />
                      <span>Company Address</span>
                  {sectionStates.companyAddress.completed &&
                        sectionStates.companyAddress.collapsed && (
                        <span className="completion-tick visible">✔</span>
                      )}
                      <FaChevronDown
                        className={`dropdown-icon ${sectionStates.companyAddress.collapsed ? 'collapsed' : ''}`}
                      />
                    </div>
                    <hr className="section-divider" />
                    <div
                      className={`collapsible-content ${sectionStates.companyAddress.collapsed ? 'collapsed' : ''}`}
                    >
                      <div className="form-grid two-col-grid">
                        <div className="form-group">
                          <input
                            type="text"
                            id="companyHouseNumber"
                            className={`paper-input ${value.companyHouseNumber ? 'filled' : ''}`}
                            value={value.companyHouseNumber}
                            onChange={handleInputChange}
                            placeholder="House/Building Number"
                            onBlur={() => {
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ]);
                              handleBlur('companyDetails', COMPANY_SECTION_FIELDS);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            id="companyStreet"
                            className={`paper-input ${value.companyStreet ? 'filled' : ''}`}
                            value={value.companyStreet}
                            onChange={handleInputChange}
                            placeholder="Street"
                            onBlur={() => {
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ]);
                              handleBlur('companyDetails', COMPANY_SECTION_FIELDS);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            id="companyCity"
                            className={`paper-input ${value.companyCity ? 'filled' : ''}`}
                            value={value.companyCity}
                            onChange={handleInputChange}
                            placeholder="City/Town"
                            onBlur={() => {
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ]);
                              handleBlur('companyDetails', COMPANY_SECTION_FIELDS);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            id="companyCounty"
                            className={`paper-input ${value.companyCounty ? 'filled' : ''}`}
                            value={value.companyCounty}
                            onChange={handleInputChange}
                            placeholder="County"
                            onBlur={() => {
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ]);
                              handleBlur('companyDetails', COMPANY_SECTION_FIELDS);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            id="companyPostcode"
                            className={`paper-input ${value.companyPostcode ? 'filled' : ''}`}
                            value={value.companyPostcode}
                            onChange={handleInputChange}
                            placeholder="Post Code"
                            onBlur={() => {
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ]);
                              handleBlur('companyDetails', COMPANY_SECTION_FIELDS);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <select
                            id="companyCountry"
                            className={`paper-input-select ${value.companyCountry ? 'filled' : ''}`}
                            value={value.companyCountry}
                            onChange={handleInputChange}
                            onBlur={() => {
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ]);
                              handleBlur('companyDetails', COMPANY_SECTION_FIELDS);
                            }}
                          >
                            <option value="">Country</option>
                            {countries.map(c => (
                              <option key={c.id} value={c.name}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <hr />
            </>
          )}

          <div
            className={`form-group-section ${sectionStates.personalDetails.collapsed ? 'collapsed' : ''} ${sectionStates.personalDetails.completed ? 'completed' : ''}`}
          >
            <div className="group-header" onClick={() => toggleSection('personalDetails')}>
              <FaUser className="section-icon" />
              <span>Personal Details</span>
              {sectionStates.personalDetails.completed &&
                sectionStates.personalDetails.collapsed && (
                <span className="completion-tick visible">
                  <svg viewBox="0 0 24 24">
                    <polyline
                      points="5,13 10,18 19,7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.personalDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            <div
              className={`collapsible-content ${sectionStates.personalDetails.collapsed ? 'collapsed' : ''}`}
            >
              {isCompanyClient && (
                <p className="disclaimer">
                  Please use your personal details if you are a director of the company.
                </p>
              )}
              <div className="form-grid personal-grid names-row">
                <div className="form-group name-title">
                  <select
                    id="title"
                    className={`paper-input-select ${value.title ? 'filled' : ''}`}
                    value={value.title}
                    onChange={handleInputChange}
                    onBlur={() =>
                      handleBlur('personalDetails', [
                        'title',
                        'firstName',
                        'lastName',
                        'dob',
                        'gender',
                        'nationality',
                      ])
                    }
                  >
                    <option value="">Title</option>
                    {titles.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group name-first">
                  <input
                    type="text"
                    id="firstName"
                    className={`paper-input ${value.firstName ? 'filled' : ''}`}
                    value={value.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                    onBlur={() =>
                      handleBlur('personalDetails', [
                        'title',
                        'firstName',
                        'lastName',
                        'dob',
                        'gender',
                        'nationality',
                      ])
                    }
                  />
                </div>
                <div className="form-group name-last">
                  <input
                    type="text"
                    id="lastName"
                    className={`paper-input ${value.lastName ? 'filled' : ''}`}
                    value={value.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                    onBlur={() =>
                      handleBlur('personalDetails', [
                        'title',
                        'firstName',
                        'lastName',
                        'dob',
                        'gender',
                        'nationality',
                      ])
                    }
                  />
                </div>
              </div>
              <div className="form-grid personal-grid">
                <div className="form-group">
                  <input
                    type="text"
                    id="dob"
                    className={`paper-input ${value.dob ? 'filled' : ''}`}
                    value={value.dob}
                    onChange={handleInputChange}
                    placeholder="DoB (dd/mm/yyyy)"
                    onBlur={() =>
                      handleBlur('personalDetails', [
                        'title',
                        'firstName',
                        'lastName',
                        'dob',
                        'gender',
                        'nationality',
                      ])
                    }
                  />
                </div>
                <div className="form-group">
                  <select
                    id="gender"
                    className={`paper-input-select ${value.gender ? 'filled' : ''}`}
                    value={value.gender}
                    onChange={handleInputChange}
                    onBlur={() =>
                      handleBlur('personalDetails', [
                        'title',
                        'firstName',
                        'lastName',
                        'dob',
                        'gender',
                        'nationality',
                      ])
                    }
                  >
                    <option value="">Gender</option>
                    {genders.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <select
                    id="nationality"
                    className={`paper-input-select ${value.nationality ? 'filled' : ''}`}
                    value={value.nationality}
                    onChange={handleInputChange}
                    onBlur={() =>
                      handleBlur('personalDetails', [
                        'title',
                        'firstName',
                        'lastName',
                        'dob',
                        'gender',
                        'nationality',
                      ])
                    }
                  >
                    <option value="">Nationality</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <hr />

          <div
            className={`form-group-section ${sectionStates.addressDetails.collapsed ? 'collapsed' : ''} ${sectionStates.addressDetails.completed ? 'completed' : ''}`}
          >
            <div className="group-header" onClick={() => toggleSection('addressDetails')}>
              <FaMapMarkerAlt className="section-icon" />
              <span>Address Details</span>
              {sectionStates.addressDetails.completed &&
                sectionStates.addressDetails.collapsed && (
                <span className="completion-tick visible">
                  <svg viewBox="0 0 24 24">
                    <polyline
                      points="5,13 10,18 19,7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.addressDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            <div
              className={`collapsible-content ${sectionStates.addressDetails.collapsed ? 'collapsed' : ''}`}
            >
              <div className="form-grid two-col-grid">
                <div className="form-group">
                  <input
                    type="text"
                    id="houseNumber"
                    className={`paper-input ${value.houseNumber ? 'filled' : ''}`}
                    value={value.houseNumber}
                    onChange={handleInputChange}
                    placeholder="House/Building Number"
                    onBlur={() =>
                      handleBlur('addressDetails', [
                        'houseNumber',
                        'street',
                        'city',
                        'county',
                        'postcode',
                        'country',
                      ])
                    }
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="street"
                    className={`paper-input ${value.street ? 'filled' : ''}`}
                    value={value.street}
                    onChange={handleInputChange}
                    placeholder="Street"
                    onBlur={() =>
                      handleBlur('addressDetails', [
                        'houseNumber',
                        'street',
                        'city',
                        'county',
                        'postcode',
                        'country',
                      ])
                    }
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="city"
                    className={`paper-input ${value.city ? 'filled' : ''}`}
                    value={value.city}
                    onChange={handleInputChange}
                    placeholder="City/Town"
                    onBlur={() =>
                      handleBlur('addressDetails', [
                        'houseNumber',
                        'street',
                        'city',
                        'county',
                        'postcode',
                        'country',
                      ])
                    }
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="county"
                    className={`paper-input ${value.county ? 'filled' : ''}`}
                    value={value.county}
                    onChange={handleInputChange}
                    placeholder="County"
                    onBlur={() =>
                      handleBlur('addressDetails', [
                        'houseNumber',
                        'street',
                        'city',
                        'county',
                        'postcode',
                        'country',
                      ])
                    }
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="postcode"
                    className={`paper-input ${value.postcode ? 'filled' : ''}`}
                    value={value.postcode}
                    onChange={handleInputChange}
                    placeholder="Post Code"
                    onBlur={() =>
                      handleBlur('addressDetails', [
                        'houseNumber',
                        'street',
                        'city',
                        'county',
                        'postcode',
                        'country',
                      ])
                    }
                  />
                </div>
                <div className="form-group">
                  <select
                    id="country"
                    className={`paper-input-select ${value.country ? 'filled' : ''}`}
                    value={value.country}
                    onChange={handleInputChange}
                    onBlur={() =>
                      handleBlur('addressDetails', [
                        'houseNumber',
                        'street',
                        'city',
                        'county',
                        'postcode',
                        'country',
                      ])
                    }
                  >
                    <option value="">Country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <hr />

          <div
            className={`form-group-section ${sectionStates.contactDetails.collapsed ? 'collapsed' : ''} ${sectionStates.contactDetails.completed ? 'completed' : ''}`}
          >
            <div className="group-header" onClick={() => toggleSection('contactDetails')}>
              <FaPhone className="section-icon" />
              <span>Contact Details</span>
              {sectionStates.contactDetails.completed &&
                sectionStates.contactDetails.collapsed && (
                <span className="completion-tick visible">
                  <svg viewBox="0 0 24 24">
                    <polyline
                      points="5,13 10,18 19,7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.contactDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            <div
              className={`collapsible-content ${sectionStates.contactDetails.collapsed ? 'collapsed' : ''}`}
            >
              <div className="form-grid two-col-grid">
                <div className="form-group">
                  <input
                    type="tel"
                    id="phone"
                    className={`paper-input ${value.phone ? 'filled' : ''}`}
                    value={value.phone}
                    onChange={handleInputChange}
                    placeholder="Best Phone Number"
                    onBlur={() => handleBlur('contactDetails', ['phone', 'email'])}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    id="email"
                    className={`paper-input ${value.email ? 'filled' : ''}`}
                    value={value.email}
                    onChange={handleInputChange}
                    placeholder="Best Email"
                    onBlur={() => handleBlur('contactDetails', ['phone', 'email'])}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="button-group">
            <button
              type="button"
              className="btn secondary"
              onClick={handleBack}
              aria-label="Go back to ID confirmation"
            >
              Back
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setStep(3)}
              aria-label="Proceed to ID details"
              disabled={!validateBasicDetails()}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="form-content">

          <div className="form-group step1-centered question-container">
            <label id="id-type-label" className="question-banner">
              Which form of ID are you providing?
              <InfoPopover text="Choose one" />
            </label>
            <div className="modern-toggle-group" role="radiogroup" aria-labelledby="id-type-label">
                  <button
                    type="button"
                    className={`modern-toggle-button ${idType === 'passport' ? 'active' : ''}`}
                    onClick={() => handleIdTypeChange('passport')}
                    aria-pressed={idType === 'passport'}
                    role="radio"
                  >
                    Passport
                  </button>
                  <button
                    type="button"
                    className={`modern-toggle-button ${idType === 'driver-license' ? 'active' : ''}`}
                    onClick={() => handleIdTypeChange('driver-license')}
                    aria-pressed={idType === 'driver-license'}
                    role="radio"
                  >
                    Driver's License
                  </button>
                </div>
            {(idType === 'passport' || idType === 'driver-license') && (
              <div className="form-group">
                <input
                  type="text"
                  id="idNumber"
                  className={`paper-input ${value.idNumber ? 'filled' : ''}`}
                  value={value.idNumber}
                  onChange={handleInputChange}
                  placeholder={idType === 'passport' ? 'Passport Number' : "Driver's License Number"}
                  onBlur={() => handleBlur('idDetails', ['idNumber'])}
                />
              </div>
            )}
          </div>
          <hr />

          <div
            className={`form-group-section ${sectionStates.helixContact.collapsed ? 'collapsed' : ''} ${sectionStates.helixContact.completed ? 'completed' : ''}`}
          >
            <div className="group-header" onClick={() => toggleSection('helixContact')}>
              <FaUserTie className="section-icon" />
              <span>Helix Contact</span>
              {sectionStates.helixContact.completed &&
                sectionStates.helixContact.collapsed && (
                <span className="completion-tick visible">
                  <svg viewBox="0 0 24 24">
                    <polyline
                      points="5,13 10,18 19,7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.helixContact.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            <div
              className={`collapsible-content ${sectionStates.helixContact.collapsed ? 'collapsed' : ''}`}
            >
              <div className="form-group">
                <select
                  id="helixContact"
                  className={`paper-input-select ${value.helixContact ? 'filled' : ''}`}
                  value={value.helixContact}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('helixContact', ['helixContact'])}
                >
                  <option value="" disabled hidden>
                    Person you have spoken to at Helix Law
                  </option>
                  <option value="Unsure">Unsure</option>
                  {(activeTeam.length > 0 ? activeTeam : ['John Doe', 'Jane Smith']).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <hr />

          <div className="button-group">
            <button
              type="button"
              className="btn secondary"
              onClick={handleBack}
              aria-label="Go back to previous step"
            >
              Back
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleNextStep}
              aria-label="Proceed to next step"
              disabled={!validateForm()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProofOfIdComponent = ProofOfId;
export default ProofOfIdComponent;
