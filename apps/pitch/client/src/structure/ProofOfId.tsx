import React, { useState, useEffect } from 'react';
import { FaUser, FaCity, FaMapMarkerAlt, FaPhone, FaIdCard, FaUserTie, FaChevronDown } from 'react-icons/fa';
import '../styles/ProofOfId.css';
import { ProofData } from '../context/ProofData';

interface ProofOfIdProps {
  value: ProofData;
  onUpdate: (data: ProofData) => void;
  setIsComplete: (complete: boolean) => void;
  onNext: () => void;
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

const ProofOfId: React.FC<ProofOfIdProps> = ({ value, onUpdate, setIsComplete, onNext }) => {
  const [step, setStep] = useState<number>(1);
  const [step1Page, setStep1Page] = useState(0);
  const idStatus = value.idStatus || '';
  const isCompanyClient = value.isCompanyClient ?? null;
  const idType = value.idType || null;

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

  // Effect to re-evaluate section completion status when value changes
  useEffect(() => {
    const sections: { key: keyof SectionStates; fields: string[] }[] = [
      { key: 'companyDetails', fields: ['companyName', 'companyNumber'] },
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
        fields: ['title', 'firstName', 'lastName', 'nationality', 'dob', 'gender'],
      },
      {
        key: 'addressDetails',
        fields: ['houseNumber', 'street', 'city', 'county', 'postcode', 'country'],
      },
      { key: 'contactDetails', fields: ['phone', 'email'] },
      { key: 'idDetails', fields: ['idNumber'] },
      { key: 'helixContact', fields: ['helixContact'] },
    ];

    sections.forEach(({ key, fields }) => {
      const isCompleted = checkSectionCompletion(fields);
      setSectionStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          completed: isCompleted,
        },
      }));
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
  const handleBlur = (sectionKey: keyof SectionStates, sectionFields: string[]) => {
    const isCompleted = checkSectionCompletion(sectionFields);
    if (isCompleted) {
      setSectionStates((prev) => ({
        ...prev,
        [sectionKey]: { collapsed: true, completed: true },
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
    const updatedData = { ...value, [id]: inputValue, idStatus, isCompanyClient, idType };
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
    const updatedData = { ...value, idType: type };
    onUpdate(updatedData);
    // Auto-expand the section when picking an ID type
    setSectionStates(prev => ({
      ...prev,
      idDetails: { ...prev.idDetails, collapsed: false }
    }));
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setIsComplete(true);
    } else {
      setIsComplete(false);
    }
    onNext();
  };

  const handleBack = () => {
    setStep(1);
    // No value reset at all.
  };

  return (
    <div className="form-container apple-form">
    {step === 1 && (
      <>
        {/* BOTH Step 1 questions, always visible */}
        <div className="form-group step1-centered">
          <label className="radio-question">
            Are you providing ID for the first time or have you been asked to renew ID?
            <span className="info-icon">i
              <span className="help-text">
                Select 'First-Time ID' if this is your initial identity proof. Choose 'Renewing ID' if you are updating an existing ID.
              </span>
            </span>
          </label>
          <div className="modern-toggle-group">
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

        <div className="form-group step1-centered">
          <label className="radio-question">
            Who are you proving identity for?
            <span className="info-icon">i
              <span className="help-text">
                Select 'For Myself' if you are proving your own identity. Choose 'For a Company' if you are acting on behalf of a business.
              </span>
            </span>
          </label>
          <div className="modern-toggle-group">
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
              <div className="form-group-section">
                <div className="group-header" onClick={() => toggleSection('companyDetails')}>
                  <FaCity className="section-icon" />
                  <span>Company Details</span>
                  {sectionStates.companyDetails.completed && (
                    <span className="completion-tick">✔</span>
                  )}
                  <FaChevronDown
                    className={`dropdown-icon ${sectionStates.companyDetails.collapsed ? 'collapsed' : ''}`}
                  />
                </div>
                <hr className="section-divider" />
                {!sectionStates.companyDetails.collapsed && (
                  <div className="form-grid">
                    <div className="form-group">
                      <input
                        type="text"
                        id="companyName"
                        className={`paper-input ${value.companyName ? 'filled' : ''}`}
                        value={value.companyName}
                        onChange={handleInputChange}
                        placeholder="Company Name"
                        onBlur={() =>
                          handleBlur('companyDetails', ['companyName', 'companyNumber'])
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
                          handleBlur('companyDetails', ['companyName', 'companyNumber'])
                        }
                      />
                    </div>
                  </div>
                )}
                {!sectionStates.companyDetails.collapsed && (
                  <div className="form-section address-section">
                    <div
                      className="group-header"
                      onClick={() => toggleSection('companyAddress')}
                    >
                      <FaMapMarkerAlt className="section-icon" />
                      <span>Company Address</span>
                      {sectionStates.companyAddress.completed && (
                        <span className="completion-tick">✔</span>
                      )}
                      <FaChevronDown
                        className={`dropdown-icon ${sectionStates.companyAddress.collapsed ? 'collapsed' : ''}`}
                      />
                    </div>
                    <hr className="section-divider" />
                    {!sectionStates.companyAddress.collapsed && (
                      <div className="form-grid">
                        <div className="form-group">
                          <input
                            type="text"
                            id="companyHouseNumber"
                            className={`paper-input ${value.companyHouseNumber ? 'filled' : ''}`}
                            value={value.companyHouseNumber}
                            onChange={handleInputChange}
                            placeholder="House/Building Number"
                            onBlur={() =>
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ])
                            }
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
                            onBlur={() =>
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ])
                            }
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
                            onBlur={() =>
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ])
                            }
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
                            onBlur={() =>
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ])
                            }
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
                            onBlur={() =>
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ])
                            }
                          />
                        </div>
                        <div className="form-group">
                          <select
                            id="companyCountry"
                            className={`paper-input-select ${value.companyCountry ? 'filled' : ''}`}
                            value={value.companyCountry}
                            onChange={handleInputChange}
                            onBlur={() =>
                              handleBlur('companyAddress', [
                                'companyHouseNumber',
                                'companyStreet',
                                'companyCity',
                                'companyCounty',
                                'companyPostcode',
                                'companyCountry',
                              ])
                            }
                          >
                            <option value="">Country</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <hr />
            </>
          )}

          <div className="form-group-section">
            <div className="group-header" onClick={() => toggleSection('personalDetails')}>
              <FaUser className="section-icon" />
              <span>Personal Details</span>
              {sectionStates.personalDetails.completed && (
                <span className="completion-tick">✔</span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.personalDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            {!sectionStates.personalDetails.collapsed && (
              <>
                {isCompanyClient && (
                  <p className="disclaimer">
                    Please use your personal details if you are a director of the company.
                  </p>
                )}
                <div className="form-grid">
                  <div className="form-group">
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
        'nationality',
        'dob',
        'gender',
      ])
    }
  >
    <option value="">Title</option>
    <option value="Mr">Mr</option>
    <option value="Mrs">Mrs</option>
    <option value="Miss">Miss</option>
    <option value="Ms">Ms</option>
    <option value="Dr">Dr</option>
    <option value="Mx">Mx</option>
    <option value="Rev">Rev</option>
    <option value="Prof">Prof</option>
    <option value="Sir">Sir</option>
    <option value="Dame">Dame</option>
    <option value="Lord">Lord</option>
    <option value="Lady">Lady</option>
  </select>
</div>
                  <div className="form-group">
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
                          'nationality',
                          'dob',
                          'gender',
                        ])
                      }
                    />
                  </div>
                  <div className="form-group">
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
                          'nationality',
                          'dob',
                          'gender',
                        ])
                      }
                    />
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
                          'nationality',
                          'dob',
                          'gender',
                        ])
                      }
                    >
                      <option value="">Nationality</option>
                      <option value="British">British</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <input
                      type="date"
                      id="dob"
                      className={`paper-input ${value.dob ? 'filled' : ''}`}
                      value={value.dob}
                      onChange={handleInputChange}
                      placeholder="Date of Birth"
                      onBlur={() =>
                        handleBlur('personalDetails', [
                          'title',
                          'firstName',
                          'lastName',
                          'nationality',
                          'dob',
                          'gender',
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
                          'nationality',
                          'dob',
                          'gender',
                        ])
                      }
                    >
                      <option value="">Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
          <hr />

          <div className="form-group-section">
            <div className="group-header" onClick={() => toggleSection('addressDetails')}>
              <FaMapMarkerAlt className="section-icon" />
              <span>Address Details</span>
              {sectionStates.addressDetails.completed && (
                <span className="completion-tick">✔</span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.addressDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            {!sectionStates.addressDetails.collapsed && (
              <div className="form-grid">
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
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <hr />

          <div className="form-group-section">
            <div className="group-header" onClick={() => toggleSection('contactDetails')}>
              <FaPhone className="section-icon" />
              <span>Contact Details</span>
              {sectionStates.contactDetails.completed && (
                <span className="completion-tick">✔</span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.contactDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            {!sectionStates.contactDetails.collapsed && (
              <div className="form-grid">
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
            )}
          </div>
          <hr />

          <div className="form-group-section">
            <div className="group-header" onClick={() => toggleSection('idDetails')}>
              <FaIdCard className="section-icon" />
              <span>ID Details</span>
              {sectionStates.idDetails.completed && (
                <span className="completion-tick">✔</span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.idDetails.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            {!sectionStates.idDetails.collapsed && (
              <div className="form-group">
                <div className="apple-toggle-group">
                  <button
                    type="button"
                    className={`apple-toggle-button ${idType === 'passport' ? 'active' : ''}`}
                    onClick={() => handleIdTypeChange('passport')}
                  >
                    Passport
                  </button>
                  <button
                    type="button"
                    className={`apple-toggle-button ${idType === 'driver-license' ? 'active' : ''}`}
                    onClick={() => handleIdTypeChange('driver-license')}
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
            )}
          </div>
          <hr />

          <div className="form-group-section">
            <div className="group-header" onClick={() => toggleSection('helixContact')}>
              <FaUserTie className="section-icon" />
              <span>Helix Contact</span>
              {sectionStates.helixContact.completed && (
                <span className="completion-tick">✔</span>
              )}
              <FaChevronDown
                className={`dropdown-icon ${sectionStates.helixContact.collapsed ? 'collapsed' : ''}`}
              />
            </div>
            <hr className="section-divider" />
            {!sectionStates.helixContact.collapsed && (
              <div className="form-group">
                <select
                  id="helixContact"
                  className={`paper-input-select ${value.helixContact ? 'filled' : ''}`}
                  value={value.helixContact}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('helixContact', ['helixContact'])}
                >
                  <option value="">Person you have spoken to at Helix Law</option>
                  <option value="John Doe">John Doe</option>
                  <option value="Jane Smith">Jane Smith</option>
                </select>
              </div>
            )}
          </div>
          <hr />

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