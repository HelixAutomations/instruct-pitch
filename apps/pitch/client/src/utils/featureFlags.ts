/**
 * Feature Flag Configuration
 * 
 * Centralized feature flag management for gradual rollout of new features
 */

export interface FeatureFlags {
  PAYMENTS_UX_V2: boolean;
}

/**
 * Get feature flag value from environment variables or defaults
 */
export const getFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  const envValue = import.meta.env[`VITE_${flag}`];
  
  switch (flag) {
    case 'PAYMENTS_UX_V2':
      return envValue === 'true' || envValue === '1';
    default:
      return false;
  }
};

/**
 * Get all feature flags with their current values
 */
export const getFeatureFlags = (): FeatureFlags => {
  return {
    PAYMENTS_UX_V2: getFeatureFlag('PAYMENTS_UX_V2'),
  };
};

/**
 * Hook to use feature flags in React components
 */
export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  return getFeatureFlag(flag);
};

/**
 * Hook to get all feature flags
 */
export const useFeatureFlags = (): FeatureFlags => {
  return getFeatureFlags();
};