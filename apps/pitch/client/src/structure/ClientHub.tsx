import React from 'react';
import {
    FaClipboardList,
    FaIdBadge,
    FaUserTie,
    FaEnvelope,
} from 'react-icons/fa';
import '../styles/ClientHub.css';

interface ClientHubProps {
    instructionRef: string;
    clientId: string;
    feeEarner?: string;
    email?: string;
}

const ClientHub: React.FC<ClientHubProps> = ({ instructionRef, clientId, feeEarner, email }) => {
    const items = [
        { label: 'Instruction Ref', value: instructionRef, icon: <FaClipboardList /> },
        { label: 'Client ID', value: clientId, icon: <FaIdBadge /> },
        feeEarner ? { label: 'Fee Earner', value: feeEarner, icon: <FaUserTie /> } : null,
        email ? { label: 'Email', value: email, icon: <FaEnvelope /> } : null,
    ].filter(Boolean) as { label: string; value: string; icon: JSX.Element }[];

    if (!items.length) return null;

    return (
        <div className="client-hub">
            {items.map((item, idx) => (
                <React.Fragment key={item.label}>
                    <div className="hub-item">
                        <span className="hub-icon">{item.icon}</span>
                        <span className="hub-text">
                            <span className="hub-key">{item.label}</span>
                            <span className="hub-value">{item.value}</span>
                        </span>
                    </div>
                    {idx < items.length - 1 && <div className="hub-divider" aria-hidden="true" />}
                </React.Fragment>
            ))}
        </div>
    );
};

export default ClientHub;