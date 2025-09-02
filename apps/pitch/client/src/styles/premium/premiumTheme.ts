/**
 * Premium Payment Theme
 * Extended design tokens for premium payment UX
 */

import { colours } from '../colours';

export const premiumTheme = {
  // Core Helix colors
  colors: {
    // Primary brand colors
    primary: colours.helixBlue,           // #0D2F60
    primaryDark: colours.helixDarkBlue,   // #061733
    highlight: colours.helixHighlight,    // #3690CE
    accent: colours.helixAccent,          // #87F3F3
    cta: colours.cta,                     // #D65541
    
    // Neutral palette
    background: '#FFFFFF',
    surface: colours.helixGrey,           // #F4F4F6
    surfaceElevated: '#FFFFFF',
    
    // Text colors
    text: colours.helixDarkBlue,          // #061733
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    
    // Trust & security colors
  success: '#14B07A',
    warning: '#F59E0B',
    error: '#EF4444',
    
    // Payment specific
    cardBorder: '#E5E7EB',
    cardBorderFocus: colours.helixHighlight,
  securityGreen: '#14B07A',
    loadingSkeleton: '#F3F4F6',
  },
  
  // Spacing scale (8px base unit)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  
  // Typography scale
  typography: {
    // Amount display (large, prominent)
    amount: {
      fontSize: '2.5rem',
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
    },
    
    // Step headers
    heading: {
      fontSize: '1.5rem',
      fontWeight: '600',
      lineHeight: '1.3',
    },
    
    // Body text
    body: {
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.6',
    },
    
    // Helper text
    caption: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.4',
    },
    
    // Trust indicators
    trust: {
      fontSize: '0.75rem',
      fontWeight: '500',
      lineHeight: '1.3',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
  },
  
  // Border radius
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  
  // Shadows
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    preflight: '1000ms', // For preflight loading
  },
  
  // Layout breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;

export type PremiumTheme = typeof premiumTheme;
