export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface Title {
  id: number;
  name: string;
}

export interface Gender {
  id: number;
  name: string;
  code: string;
}

// NOTE: This is a shortened subset of the reference data provided.
export const countries: Country[] = [
  { id: 1, name: 'Andorra', code: 'AD' },
  { id: 2, name: 'United Arab Emirates', code: 'AE' },
  { id: 3, name: 'Afghanistan', code: 'AF' },
  { id: 4, name: 'Antigua and Barbuda', code: 'AG' },
  { id: 5, name: 'Anguilla', code: 'AI' },
  { id: 6, name: 'Albania', code: 'AL' },
  { id: 7, name: 'Armenia', code: 'AM' },
  { id: 8, name: 'Angola', code: 'AO' },
  { id: 9, name: 'Antarctica', code: 'AQ' },
  { id: 10, name: 'Argentina', code: 'AR' },
];

export const titles: Title[] = [
  { id: 1, name: 'Mr' },
  { id: 2, name: 'Mrs' },
  { id: 3, name: 'Ms' },
  { id: 4, name: 'Miss' },
  { id: 5, name: 'Sir' },
  { id: 6, name: 'Dr' },
  { id: 7, name: 'Prof' },
  { id: 8, name: 'Lord' },
  { id: 9, name: 'Lady' },
  { id: 10, name: 'Master' },
];

export const genders: Gender[] = [
  { id: 1, name: 'Male', code: 'M' },
  { id: 2, name: 'Female', code: 'F' },
  { id: 3, name: 'Other', code: 'O' },
];