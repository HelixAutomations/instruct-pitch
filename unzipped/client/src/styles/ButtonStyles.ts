// src/app/styles/ButtonStyles.ts
import { IButtonStyles } from '@fluentui/react';
import { colours } from './colours';

// Helper function for creating a consistent radial gradient overlay
const createRadialGradient = (baseColor: string) =>
  `radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%), ${baseColor} !important`;

// Shared Primary Button Styles
export const sharedPrimaryButtonStyles: IButtonStyles = {
  root: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: colours.cta,
    border: 'none',
    height: '40px',
    fontWeight: '600',
    color: '#ffffff',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    transform: 'none !important',
    outline: 'none !important',
    ':focus': {
      outline: 'none !important',
      border: 'none !important',
      transform: 'none !important',
    },
  },
  rootHovered: {
    background: createRadialGradient(colours.cta),
    boxShadow: '0 0 8px rgba(0,0,0,0.2) !important',
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  rootPressed: {
    background: createRadialGradient(colours.cta),
    boxShadow: '0 0 8px rgba(0,0,0,0.3) !important',
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  rootFocused: {
    backgroundColor: `${colours.cta} !important`,
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  label: {
    color: '#ffffff !important',
  },
};

// Shared Default Button Styles
export const sharedDefaultButtonStyles: IButtonStyles = {
  root: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: colours.secondaryButtonBackground,
    border: 'none',
    height: '40px',
    fontWeight: 'normal',
    color: '#000000',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    transform: 'none !important',
    outline: 'none !important',
    ':focus': {
      outline: 'none !important',
      border: 'none !important',
      transform: 'none !important',
    },
  },
  rootHovered: {
    background: `radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%), ${colours.secondaryButtonBackground} !important`,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15) !important',
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  rootPressed: {
    background: `radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%), ${colours.secondaryButtonBackground} !important`,
    boxShadow: '0 0 8px rgba(0,0,0,0.2) !important',
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  rootFocused: {
    backgroundColor: `${colours.secondaryButtonBackground} !important`,
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  label: {
    color: '#000000 !important',
    fontWeight: 'normal !important',
  },
};

// Shared Draft Confirmed Button Styles
export const sharedDraftConfirmedButtonStyles: IButtonStyles = {
  root: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    border: `2px solid ${colours.green} !important`,
    height: '40px',
    fontWeight: '600',
    color: `${colours.green} !important`,
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2)',
    transition: 'background 0.3s ease, box-shadow 0.3s ease, border 0.3s ease',
    transform: 'none !important',
    outline: 'none !important',
    ':focus': {
      outline: 'none !important',
      border: `2px solid ${colours.green} !important`,
      transform: 'none !important',
    },
  },
  rootHovered: {
    background: `${colours.green}cc !important`,
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.3) !important',
    transform: 'none !important',
    outline: 'none !important',
  },
  rootPressed: {
    background: `${colours.green}b3 !important`,
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3) !important',
    transform: 'none !important',
    outline: 'none !important',
  },
  rootFocused: {
    backgroundColor: 'transparent !important',
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2) !important',
    border: `2px solid ${colours.green} !important`,
    transform: 'none !important',
    outline: 'none !important',
  },
  rootDisabled: {
    backgroundColor: 'transparent !important',
    border: `2px solid ${colours.green} !important`,
    color: `${colours.green} !important`,
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2) !important',
  },
  icon: {
    color: `${colours.green} !important`,
  },
  label: {
    color: `${colours.green} !important`,
  },
  iconDisabled: {
    color: `${colours.green} !important`,
  },
  labelDisabled: {
    color: `${colours.green} !important`,
  },
};

// Decision Button (example)
export const sharedDecisionButtonStyles: IButtonStyles = {
  root: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: colours.helixHighlight,
    border: 'none',
    height: '40px',
    fontWeight: '600',
    color: '#ffffff',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    transform: 'none !important',
    outline: 'none !important',
    ':focus': {
      outline: 'none !important',
      border: 'none !important',
      transform: 'none !important',
    },
  },
  rootHovered: {
    background: createRadialGradient(colours.helixHighlight),
    boxShadow: '0 0 8px rgba(0,0,0,0.2) !important',
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  rootPressed: {
    background: createRadialGradient(colours.helixHighlight),
    boxShadow: '0 0 8px rgba(0,0,0,0.3) !important',
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  rootFocused: {
    backgroundColor: `${colours.helixHighlight} !important`,
    transform: 'none !important',
    outline: 'none !important',
    border: 'none !important',
  },
  label: {
    color: '#ffffff !important',
  },
  rootDisabled: {
    backgroundColor: colours.helixHighlight,
    border: 'none !important',
    color: '#ffffff !important',
    opacity: 0.6,
    boxShadow: 'none !important',
  },
};
