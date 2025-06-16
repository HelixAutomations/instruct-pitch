import React from 'react';
import {
    FaClipboardList,
    FaIdBadge,
    FaUserTie,
    FaCheckCircle,
    FaFolderOpen,
    FaDownload,
    FaCalendarAlt,
} from 'react-icons/fa';
import '../styles/ClientHub.css';

interface ClientHubProps {
    instructionRef: string;
    clientId: string;
    feeEarner?: string;
    idExpiry?: string;
    idVerified?: boolean;
    matterRef?: string;
}

const ClientHub: React.FC<ClientHubProps> = ({ instructionRef, clientId, feeEarner, idExpiry, idVerified, matterRef }) => {
    const primaryItems = [
        { label: 'Instruction Ref', value: instructionRef, icon: <FaClipboardList /> },
        { label: 'Client ID', value: clientId, icon: <FaIdBadge /> },
        feeEarner ? { label: 'Solicitor', value: feeEarner, icon: <FaUserTie /> } : null,
        idExpiry ? { label: 'ID Expiry', value: idExpiry, icon: <FaCalendarAlt /> } : null,
    ].filter(Boolean) as { label: string; value: string; icon: JSX.Element }[];

    const secondaryItems = [
        idVerified != null ? { label: 'ID Check', value: idVerified ? 'Verified' : 'Pending', icon: <FaCheckCircle /> } : null,
        { label: 'Matter Ref', value: matterRef ?? 'Pending', icon: <FaFolderOpen /> },
        { label: 'CCL', value: 'Ready', icon: <FaDownload />, link: '/pitch/docs/ccl.pdf' },
        { label: 'Terms of Business', value: 'Ready', icon: <FaDownload />, link: '/pitch/docs/terms-of-business.pdf' },
    ].filter(Boolean) as { label: string; value: string; icon: JSX.Element; link?: string }[];

    if (!primaryItems.length && !secondaryItems.length) return null;

    const renderRow = (items: { label: string; value: string; icon: JSX.Element; link?: string }[]) => (
        <div className="hub-row">
            {items.map((item, idx) => (
                <React.Fragment key={item.label}>
                    <div className="hub-item">
                        <span className="hub-icon">{item.icon}</span>
                        <span className="hub-text">
                            <span className="hub-key">{item.label}</span>
                            <span className="hub-value">
                                {item.link ? (
                                    <a href={item.link} download>{item.value}</a>
                                ) : (
                                    item.value
                                )}
                            </span>
                        </span>
                    </div>
                    {idx < items.length - 1 && (
                        <div className="hub-divider" aria-hidden="true" />
                    )}
                </React.Fragment>
            ))}
        </div>
    );


    return (
        <section className="client-hub-section">
            <div className="client-hub">
                {renderRow(primaryItems)}
                {secondaryItems.length > 0 && renderRow(secondaryItems)}
            </div>
        </section>
    );
};

export default ClientHub;
