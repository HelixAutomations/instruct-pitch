import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ClientData {
  clientId: string;
  instructionRef: string;
  setClientId: (id: string) => void;
  setInstructionRef: (id: string) => void;
}

const ClientContext = createContext<ClientData | undefined>(undefined);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error('useClient must be used within ClientProvider');
  return context;
};

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientId, setClientId] = useState('');
  const [instructionRef, setInstructionRef] = useState('');

  return (
    <ClientContext.Provider value={{ clientId, instructionRef, setClientId, setInstructionRef }}>
      {children}
    </ClientContext.Provider>
  );
};
