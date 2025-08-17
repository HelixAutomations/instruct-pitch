// src/context/PaymentDetails.ts

export interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvv: string;
  // Add more fields here as needed, e.g. cardholderName, billingAddress, etc.
}
