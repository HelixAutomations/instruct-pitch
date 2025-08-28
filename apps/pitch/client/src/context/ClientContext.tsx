import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DealData {
  DealId?: number;
  ProspectId?: number;
  InstructionRef?: string;
  ServiceDescription?: string;
  Amount?: number;
  Currency?: string;
  SolicitorName?: string;
  SolicitorTitle?: string;
  SolicitorEmail?: string;
  SolicitorPhone?: string;
}

interface ClientData {
  clientId: string;
  instructionRef: string;
  dealData: DealData | null;
  setClientId: (id: string) => void;
  setInstructionRef: (id: string) => void;
  setDealData: (data: DealData | null) => void;
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
  const [dealData, setDealData] = useState<DealData | null>(null);

  return (
    <ClientContext.Provider value={{ 
      clientId, 
      instructionRef, 
      dealData,
      setClientId, 
      setInstructionRef,
      setDealData
    }}>
      {children}
    </ClientContext.Provider>
  );
};
