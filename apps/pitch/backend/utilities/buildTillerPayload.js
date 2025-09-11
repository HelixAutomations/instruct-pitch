const { countries, titles, genders } = require('./referenceData');

function findIdByName(list, name) {
    if (!name) {
        console.log('[TILLER] findIdByName: no name provided');
        return undefined;
    }
    
    console.log(`[TILLER] findIdByName: searching for "${name}" in list of ${list.length} items`);
    const lower = String(name).toLowerCase();
    const entry = list.find(i => i.name.toLowerCase() === lower || i.code === name);
    
    if (entry) {
        console.log(`[TILLER] findIdByName: found "${name}" → ID ${entry.id} (${entry.name})`);
    } else {
        console.log(`[TILLER] findIdByName: "${name}" not found in list`);
        console.log(`[TILLER] Available options:`, list.slice(0, 5).map(i => `${i.name} (ID: ${i.id})`));
    }
    
    return entry ? entry.id : undefined;
}

function buildTillerPayload(data) {
    console.log('[TILLER] Building Tiller payload for:', data?.InstructionRef || data?.instructionRef || 'UNKNOWN');
    console.log('[TILLER] Input data keys:', Object.keys(data || {}));
    
    const get = (...keys) => {
        for (const k of keys) {
            if (data[k] != null) {
                console.log(`[TILLER] Found value for "${k}":`, data[k]);
                return data[k];
            }
        }
        console.log(`[TILLER] No value found for keys:`, keys);
        return undefined;
    };

    // Map country name to Alpha-2 code if needed
    const getCountryCode = () => {
        const countryCode = get('countryCode', 'CountryCode');
        const countryName = get('country', 'Country');
        
        console.log('[TILLER] getCountryCode analysis:', { 
            countryCode, 
            countryName, 
            availableCountries: countries.length,
            inputData: { countryCode: data.countryCode, CountryCode: data.CountryCode, country: data.country, Country: data.Country }
        });
        
        if (countryCode && countryCode.length === 2) {
            console.log('[TILLER] Using existing Alpha-2 countryCode:', countryCode);
            return countryCode;
        }
        
        if (countryName) {
            console.log('[TILLER] Attempting to map country name to Alpha-2 code:', countryName);
            
            // Try to find exact match first
            let countryEntry = countries.find(c => 
                c.name.toLowerCase() === countryName.toLowerCase()
            );
            
            console.log('[TILLER] Exact match search for:', countryName, 'found:', countryEntry ? `${countryEntry.name} (${countryEntry.code})` : 'none');
            
            // If no exact match, try partial match
            if (!countryEntry) {
                countryEntry = countries.find(c => 
                    c.name.toLowerCase().includes(countryName.toLowerCase()) ||
                    countryName.toLowerCase().includes(c.name.toLowerCase())
                );
                console.log('[TILLER] Partial match search found:', countryEntry ? `${countryEntry.name} (${countryEntry.code})` : 'none');
            }
            
            if (countryEntry) {
                console.log(`[TILLER] SUCCESS: Mapped country "${countryName}" → "${countryEntry.code}"`);
                return countryEntry.code;
            } else {
                console.warn(`[TILLER] WARNING: Could not map country "${countryName}" to Alpha-2 code, using default GB`);
                console.log('[TILLER] Available countries sample:', countries.slice(0, 5).map(c => `${c.name} (${c.code})`));
            }
        } else {
            console.log('[TILLER] No country name provided, using default GB');
        }
        return 'GB'; // Default fallback
    };

    // Ensure we have required address fields
    const buildingNumber = get('houseNumber', 'HouseNumber');
    const roadStreet = get('street', 'Street');
    const hasRequiredAddress = buildingNumber || roadStreet;
    
    console.log('[TILLER] Address fields:', { buildingNumber, roadStreet, hasRequiredAddress });

    // Build profile with detailed logging
    const titleId = findIdByName(titles, get('title', 'Title'));
    const genderTypeId = findIdByName(genders, get('gender', 'Gender')) || 1;
    const firstName = get('firstName', 'FirstName');
    const lastName = get('lastName', 'LastName');
    const dateOfBirth = get('dob', 'DOB');
    const mobileNumber = get('phone', 'Phone');
    const email = get('email', 'Email');
    
    console.log('[TILLER] Profile fields extracted:', {
        titleId, genderTypeId, firstName, lastName, dateOfBirth, mobileNumber, email
    });

    const profile = {
        titleId,
        genderTypeId,
        firstName,
        lastName,
        dateOfBirth,
        mobileNumber,
        email,
        cardTypes: [],
        currentAddress: {
            structured: {
                buildingNumber: buildingNumber || (hasRequiredAddress ? undefined : '1'), // Provide fallback if no address
                roadStreet: roadStreet || (hasRequiredAddress ? undefined : 'Unknown Street'), // Provide fallback
                townCity: get('city', 'City'),
                stateProvinceName: get('county', 'County'),
                postZipCode: get('postcode', 'Postcode'),
                countryCode: getCountryCode()
            }
        }
    };

    console.log('[TILLER] Built profile address:', profile.currentAddress.structured);

    const passport = get('passportNumber', 'PassportNumber');
    if (passport) {
        console.log('[TILLER] Adding passport card type:', passport);
        profile.cardTypes.push({ cardTypeId: 1, cardNumber: passport });
    }
    const drivers = get('driversLicenseNumber', 'DriversLicenseNumber');
    if (drivers) {
        console.log('[TILLER] Adding drivers license card type:', drivers);
        profile.cardTypes.push({ cardTypeId: 4, cardNumber: drivers });
    }

    console.log('[TILLER] Final card types:', profile.cardTypes);

    const payload = {
        externalReferenceId: '18207',
        runAsync: 'True',
        mock: 'False',
        checks: [
            { checkTypeId: 1, maximumSources: 3, CheckMethod: 1, matchesRequired: 1 },
            { checkTypeId: 2 }
        ],
        profile
    };
    
    console.log('[TILLER] Complete payload built successfully');
    console.log('[TILLER] Payload summary:', {
        externalReferenceId: payload.externalReferenceId,
        profileComplete: !!payload.profile,
        addressComplete: !!payload.profile.currentAddress,
        countryCode: payload.profile.currentAddress.structured.countryCode,
        cardTypesCount: payload.profile.cardTypes.length
    });

    return payload;
}

module.exports = { buildTillerPayload };
