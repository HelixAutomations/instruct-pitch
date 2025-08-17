const { countries, titles, genders } = require('./referenceData');

function findIdByName(list, name) {
    if (!name) return undefined;
    const lower = String(name).toLowerCase();
    const entry = list.find(i => i.name.toLowerCase() === lower || i.code === name);
    return entry ? entry.id : undefined;
}

function buildTillerPayload(data) {
    const get = (...keys) => {
        for (const k of keys) {
            if (data[k] != null) return data[k];
        }
        return undefined;
    };

    const profile = {
        titleId: findIdByName(titles, get('title', 'Title')),
        genderTypeId: findIdByName(genders, get('gender', 'Gender')),
        firstName: get('firstName', 'FirstName'),
        lastName: get('lastName', 'LastName'),
        dateOfBirth: get('dob', 'DOB'),
        mobileNumber: get('phone', 'Phone'),
        email: get('email', 'Email'),
        cardTypes: [],
        currentAddress: {
            structured: {
                buildingNumber: get('houseNumber', 'HouseNumber'),
                roadStreet: get('street', 'Street'),
                townCity: get('city', 'City'),
                stateProvinceName: get('county', 'County'),
                postZipCode: get('postcode', 'Postcode'),
                countryCode: get('countryCode', 'CountryCode') || get('country', 'Country')
            }
        }
    };

    const passport = get('passportNumber', 'PassportNumber');
    if (passport) {
        profile.cardTypes.push({ cardTypeId: 1, cardNumber: passport });
    }
    const drivers = get('driversLicenseNumber', 'DriversLicenseNumber');
    if (drivers) {
        profile.cardTypes.push({ cardTypeId: 4, cardNumber: drivers });
    }

    return {
        externalReferenceId: '18207',
        runAsync: 'True',
        mock: 'False',
        checks: [
            { checkTypeId: 1, maximumSources: 3, CheckMethod: 1, matchesRequired: 1 },
            { checkTypeId: 2 }
        ],
        profile
    };
}

module.exports = { buildTillerPayload };
