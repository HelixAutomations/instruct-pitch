import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CompletionState {
  summaryComplete: boolean;
  setSummaryComplete: (done: boolean) => void;
}

const CompletionContext = createContext<CompletionState | undefined>(undefined);

export const useCompletion = () => {
  const ctx = useContext(CompletionContext);
  if (!ctx) throw new Error('useCompletion must be used within CompletionProvider');
  return ctx;
};

export const CompletionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // summary completion only lasts for the current session and should
  // reset if the page reloads. Previously this value was persisted in
  // sessionStorage which meant refreshing the page kept the summary in a
  // completed state. The state is now purely in-memory so a reload will
  // clear it automatically.
  const [summaryComplete, setSummaryCompleteState] = useState(false);

  const setSummaryComplete = (done: boolean) => {
    setSummaryCompleteState(done);
  };

  return (
    <CompletionContext.Provider value={{ summaryComplete, setSummaryComplete }}>
      {children}
    </CompletionContext.Provider>
  );
};