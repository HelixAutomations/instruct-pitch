import React from 'react';
import {
    FaClipboardList,
    FaRegClipboard,
    FaIdBadge,
    FaRegIdBadge,
    FaUser,
    FaRegUser,
    FaCheckCircle,
    FaRegCheckCircle,
    FaFolderOpen,
    FaRegFolderOpen,
    FaArrowAltCircleDown,
    FaRegArrowAltCircleDown,
    FaCalendarAlt,
    FaRegCalendarAlt,
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

interface HubItem {
    label: string;
    value: string;
    icon: JSX.Element;
    hoverIcon?: JSX.Element;
    link?: string;
}

const ClientHub: React.FC<ClientHubProps> = ({
    instructionRef,
    clientId,
    feeEarner,
    idExpiry,
    idVerified,
    matterRef,
}) => {
    const primaryItems = [
        {
            label: 'Instruction Ref',
            value: instructionRef,
            icon: <FaRegClipboard />,
            hoverIcon: <FaClipboardList />,
        },
        {
            label: 'Client ID',
            value: clientId,
            icon: <FaRegIdBadge />,
            hoverIcon: <FaIdBadge />,
        },
        feeEarner
            ? {
                label: 'Solicitor',
                value: feeEarner,
                icon: <FaRegUser />,
                hoverIcon: <FaUser />,
            }
            : null,
        idExpiry
            ? {
                label: 'ID Expiry',
                value: idExpiry,
                icon: <FaRegCalendarAlt />,
                hoverIcon: <FaCalendarAlt />,
            }
            : null,
    ].filter(Boolean) as HubItem[];

    const secondaryItems = [
        idVerified != null
            ? {
                label: 'ID Check',
                value: idVerified ? 'Verified' : 'Pending',
                icon: <FaRegCheckCircle />,
                hoverIcon: <FaCheckCircle />,
            }
            : null,
        {
            label: 'Matter Ref',
            value: matterRef ?? 'Pending',
            icon: <FaRegFolderOpen />,
            hoverIcon: <FaFolderOpen />,
        },
        {
            label: 'CCL',
            value: 'Ready',
            icon: <FaRegArrowAltCircleDown />,
            hoverIcon: <FaArrowAltCircleDown />,
            link: '/pitch/docs/ccl.pdf',
        },
        {
            label: 'Terms of Business',
            value: 'Ready',
            icon: <FaRegArrowAltCircleDown />,
            hoverIcon: <FaArrowAltCircleDown />,
            link: '/pitch/docs/terms-of-business.pdf',
        },
    ].filter(Boolean) as HubItem[];

    if (!primaryItems.length && !secondaryItems.length) return null;

    const renderRow = (
        items: HubItem[],
        type: 'primary' | 'secondary'
    ) => (
        <div className={`hub-row ${type}-row`}>
            {items.map((item) => (
                <div className="hub-item" key={item.label}>
                    <span className="hub-icon">
                        <span className="icon-outline">{item.icon}</span>
                        <span className="icon-filled">{item.hoverIcon || item.icon}</span>
                    </span>
                    <span className="hub-text">
                        <span className="hub-key">{item.label}</span>
                        <span className="hub-value">
                            {item.link ? (
                                <a href={item.link} download>
                                    {item.value}
                                </a>
                            ) : (
                                item.value
                            )}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <section className="client-hub-section">
            <div className="client-hub">
                {renderRow(primaryItems, 'primary')}
                {secondaryItems.length > 0 && renderRow(secondaryItems, 'secondary')}
            </div>
        </section>
    );
};

export default ClientHub;
