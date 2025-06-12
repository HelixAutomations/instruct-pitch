import React, { useState, useEffect } from 'react';
import '../styles/ProofOfId.css';
import { countries, titles, genders } from '../data/referenceData';
import InfoPopover from '../components/InfoPopover';


interface ProofOfIdProps {
  onUpdate: (data: any) => void;
  setIsComplete: (complete: boolean) => void;
  onNext: () => void;
}

const ProofOfId: React.FC<ProofOfIdProps> = ({ onUpdate, setIsComplete, onNext }) => {
  const [step, setStep] = useState<number>(1);
  const [idStatus, setIdStatus] = useState<string>('first-time');
  const [isCompanyClient, setIsCompanyClient] = useState<boolean>(false);
  const [idType, setIdType] = useState<string | null>('passport');
  const [idConfirmationError, setIdConfirmationError] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<string[]>([]);

  useEffect(() => {
    const prefill = (window as any).helixPrefillData;
    if (Array.isArray(prefill?.activeTeam)) {
      setActiveTeam(prefill.activeTeam);
    }
  }, []);
  const [value, setvalue] = useState({
    companyName: '',
    companyNumber: '',
    companyHouseNumber: '',
    companyStreet: '',
    companyCity: '',
    companyCounty: '',
    companyPostcode: '',
    companyCountry: 'United Kingdom',
    companyCountryCode: 'GB',
    title: '',
    titleId: undefined,
    firstName: '',
    lastName: '',
    nationality: '',
    nationalityCode: undefined,
    houseNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    countryCode: 'GB',
    dob: '',
    gender: '',
    genderId: undefined,
    phone: '',
    email: '',
    idNumber: '',
    helixContact: '',
  });

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
    const { id, value } = e.target;
    setvalue((prev) => {
      const updatedData: any = { ...prev, [id]: value, idStatus, isCompanyClient, idType };

      if (id === 'title') {
        const found = titles.find(t => t.name === value);
        updatedData.titleId = found?.id;
      }

      if (id === 'gender') {
        const found = genders.find(g => g.name === value);
        updatedData.genderId = found?.id;
      }

      if (id === 'country') {
        const found = countries.find(c => c.name === value);
        updatedData.countryCode = found?.code;
      }

      if (id === 'companyCountry') {
        const found = countries.find(c => c.name === value);
        updatedData.companyCountryCode = found?.code;
      }

      if (id === 'nationality') {
        const found = countries.find(c => c.name === value);
        updatedData.nationalityCode = found?.code;
      }
      onUpdate(updatedData);
      return updatedData;
    });
  };

  const handleIdStatusChange = (status: string) => {
    setIdStatus(status);
    const updatedData = { ...value, idStatus: status, isCompanyClient, idType };
    onUpdate(updatedData);
  };

  const handleCompanyClientChange = (clientValue: boolean) => {
    setIsCompanyClient(clientValue);
    const updatedData = { ...value, idStatus, isCompanyClient: clientValue, idType };
    onUpdate(updatedData);
  };

  const handleIdTypeChange = (type: string | null) => {
    setIdType(type);
    const updatedData = {
      ...value,
      idStatus,
      isCompanyClient,
      idType: type,
      idNumber: '',
    };
    onUpdate(updatedData);
  };

  const handleIdConfirmationContinue = () => {
    if (!idStatus) {
      setIdConfirmationError('Please select whether this is your first-time ID or renewing.');
      return;
    }
    if (isCompanyClient === null) {
      setIdConfirmationError('Please select whether this is for a company client.');
      return;
    }
    setIdConfirmationError(null);
    setStep(2);
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setIsComplete(true);
    } else {
      setIsComplete(false);
    }
    onNext();
  };

  return (
    <div className="form-container apple-form">
      <div className="info-box">
        <h3>Prove Your Identity and Open a Matter</h3>
        <p>This process should take no longer than 3 minutes.</p>
        <p>Please fill out the form below:</p>
      </div>

      {step === 1 && (
        <div className="id-confirmation-container">
          <div className="id-confirmation-header">
            <p className="id-confirmation-subtitle">
              Let’s get started by confirming your ID status. This will help us fetch the right information.
            </p>
          </div>

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
                aria-pressed={idStatus === 'first-time'}
                role="radio"
              >
                First-Time ID
              </button>
              <button
                type="button"
                className={`modern-toggle-button ${idStatus === 'renewing' ? 'active' : ''}`}
                onClick={() => handleIdStatusChange('renewing')}
                aria-pressed={idStatus === 'renewing'}
                role="radio"
              >
                Renewing ID
              </button>
            </div>
          </div>

          <div className="form-group step1-centered question-container">
            <label id="company-client-label" className="question-banner">
              Who are you proving identity for?
              <InfoPopover text="Select 'For Myself' if you are proving your own identity. Choose 'For a Company' if you are acting on behalf of a business." />
            </label>
            <div className="modern-toggle-group" role="radiogroup" aria-labelledby="company-client-label">
              <button
                type="button"
                className={`modern-toggle-button ${!isCompanyClient ? 'active' : ''}`}
                onClick={() => handleCompanyClientChange(false)}
                aria-pressed={!isCompanyClient}
                role="radio"
              >
                For Myself
              </button>
              <button
                type="button"
                className={`modern-toggle-button ${isCompanyClient ? 'active' : ''}`}
                onClick={() => handleCompanyClientChange(true)}
                aria-pressed={isCompanyClient}
                role="radio"
              >
                For a Company
              </button>
            </div>
          </div>

          {idConfirmationError && (
            <div className="error-message" role="alert">
              {idConfirmationError}
            </div>
          )}

          <div className="continue-button-wrapper">
            <button
              type="button"
              className="modern-continue-button"
              onClick={handleIdConfirmationContinue}
              aria-label="Continue to the next step"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          {isCompanyClient && (
            <>
              <div className="form-section-divider"></div>
              <h3 className="section-title">Company Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="companyName">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    className="apple-input"
                    value={value.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="companyNumber">
                    Company Number
                  </label>
                  <input
                    type="text"
                    id="companyNumber"
                    className="apple-input"
                    value={value.companyNumber}
                    onChange={handleInputChange}
                    placeholder="Enter company number"
                  />
                </div>
              </div>
              <div className="form-section address-section">
                <h4 className="section-subtitle">Company Address</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyHouseNumber">
                      House/Building Number
                    </label>
                    <input
                      type="text"
                      id="companyHouseNumber"
                      className="apple-input"
                      value={value.companyHouseNumber}
                      onChange={handleInputChange}
                      placeholder="House/Building Number"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyStreet">
                      Street
                    </label>
                    <input
                      type="text"
                      id="companyStreet"
                      className="apple-input"
                      value={value.companyStreet}
                      onChange={handleInputChange}
                      placeholder="Street"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyCity">
                      City/Town
                    </label>
                    <input
                      type="text"
                      id="companyCity"
                      className="apple-input"
                      value={value.companyCity}
                      onChange={handleInputChange}
                      placeholder="City/Town"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyCounty">
                      County
                    </label>
                    <input
                      type="text"
                      id="companyCounty"
                      className="apple-input"
                      value={value.companyCounty}
                      onChange={handleInputChange}
                      placeholder="County"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyPostcode">
                      Post Code
                    </label>
                    <input
                      type="text"
                      id="companyPostcode"
                      className="apple-input"
                      value={value.companyPostcode}
                      onChange={handleInputChange}
                      placeholder="Post Code"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="companyCountry">
                      Country
                    </label>
                    <select
                      id="companyCountry"
                      className="apple-input-select"
                      value={value.companyCountry}
                      onChange={handleInputChange}
                    >
                      {countries.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div id="personal-details">
            <div className="form-section-divider"></div>
            <h3 className="section-title">Personal Details</h3>
            {isCompanyClient && (
              <p className="disclaimer">
                Please use your personal details if you are a director of the company.
              </p>
            )}
            <div className="form-grid personal-grid names-row">
              <div className="form-group">
                <label className="form-label" htmlFor="title">
                  Title
                </label>
                <select
                  id="title"
                  className="apple-input-select"
                  value={value.title}
                  onChange={handleInputChange}
                >
                  <option value="">Select title</option>
                  {titles.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  className="apple-input"
                  value={value.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  className="apple-input"
                  value={value.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="form-grid personal-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  className="apple-input-select"
                  value={value.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select gender</option>
                  {genders.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dob">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dob"
                  className="apple-input"
                  value={value.dob}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="nationality">
                  Nationality
                </label>
                <select
                  id="nationality"
                  className="apple-input-select"
                  value={value.nationality}
                  onChange={handleInputChange}
                >
                  <option value="">Select nationality</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-section address-section">
              <h4 className="section-subtitle">Personal Address</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="houseNumber">
                    House/Building Number
                  </label>
                  <input
                    type="text"
                    id="houseNumber"
                    className="apple-input"
                    value={value.houseNumber}
                    onChange={handleInputChange}
                    placeholder="House/Building Number"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="street">
                    Street
                  </label>
                  <input
                    type="text"
                    id="street"
                    className="apple-input"
                    value={value.street}
                    onChange={handleInputChange}
                    placeholder="Street"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="city">
                    City/Town
                  </label>
                  <input
                    type="text"
                    id="city"
                    className="apple-input"
                    value={value.city}
                    onChange={handleInputChange}
                    placeholder="City/Town"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="county">
                    County
                  </label>
                  <input
                    type="text"
                    id="county"
                    className="apple-input"
                    value={value.county}
                    onChange={handleInputChange}
                    placeholder="County"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="postcode">
                    Post Code
                  </label>
                  <input
                    type="text"
                    id="postcode"
                    className="apple-input"
                    value={value.postcode}
                    onChange={handleInputChange}
                    placeholder="Post Code"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="country">
                    Country
                  </label>
                  <select
                    id="country"
                    className="apple-input-select"
                    value={value.country}
                    onChange={handleInputChange}
                  >
                    {countries.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-section">
              <h4 className="section-title">Contact Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Best Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="apple-input"
                    value={value.phone}
                    onChange={handleInputChange}
                    placeholder="+44 123 456 7890"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="apple-input"
                    value={value.email}
                    onChange={handleInputChange}
                    placeholder="example@domain.com"
                  />
                </div>
              </div>
            </div>

            <div className="form-group step1-centered question-container white">
              <label id="id-type-label" className="question-banner">
                Which form of ID are you providing?
                <span className="tooltip">
                  <span className="tooltip-icon">?</span>
                  <span className="tooltip-text">Choose one.</span>
                </span>
              </label>
              <div
                className="modern-toggle-group"
                role="radiogroup"
                aria-labelledby="id-type-label"
              >
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
                  <label className="form-label" htmlFor="idNumber">
                    {idType === 'passport' ? 'Passport Number' : "Driver's License Number"}
                  </label>
                  <input
                    type="text"
                    id="idNumber"
                    className="apple-input"
                    value={value.idNumber}
                    onChange={handleInputChange}
                    placeholder={`Enter ${idType === 'passport' ? 'passport number' : "driver's license number"}`}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="helixContact">
                Person you have spoken to at Helix Law
              </label>
              <select
                id="helixContact"
                className="apple-input-select"
                value={value.helixContact}
                onChange={handleInputChange}
              >
                <option value="" disabled hidden>
                  Select a person
                </option>
                <option value="Unsure">Unsure</option>
                {activeTeam.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="form-checkbox">
              <input type="checkbox" id="agreement" className="apple-checkbox" />
              <label className="form-label" htmlFor="agreement">
                I have read all information and agree to proceed.
              </label>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="form-button secondary"
                onClick={() => setStep(1)}
                aria-label="Go back to ID confirmation"
              >
                Back
              </button>
              <button
                type="button"
                className="form-button"
                onClick={handleNextStep}
                aria-label="Proceed to next step"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProofOfId;