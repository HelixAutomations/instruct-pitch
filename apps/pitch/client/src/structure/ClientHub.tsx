import React from 'react';
import {
    FaClipboardList,
    FaIdBadge,
    FaUserTie,
    FaCheckCircle,
    FaFolderOpen,
} from 'react-icons/fa';
import '../styles/ClientHub.css';

interface ClientHubProps {
    instructionRef: string;
    clientId: string;
    feeEarner?: string;
    idVerified?: boolean;
    matterRef?: string;
}

const ClientHub: React.FC<ClientHubProps> = ({ instructionRef, clientId, feeEarner, idVerified, matterRef }) => {
    const items = [
        { label: 'Instruction Ref', value: instructionRef, icon: <FaClipboardList /> },
        { label: 'Client ID', value: clientId, icon: <FaIdBadge /> },
        feeEarner ? { label: 'Solicitor', value: feeEarner, icon: <FaUserTie /> } : null,
        idVerified != null ? { label: 'ID Check', value: idVerified ? 'Verified' : 'Pending', icon: <FaCheckCircle /> } : null,
        { label: 'Matter Ref', value: matterRef ?? 'Pending', icon: <FaFolderOpen /> },
    ].filter(Boolean) as { label: string; value: string; icon: JSX.Element }[];

    if (!items.length) return null;

    return (
        <section className="client-hub-section">
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
                        {idx < items.length - 1 && (
                            <div className="hub-divider" aria-hidden="true" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
};

export default ClientHub;
