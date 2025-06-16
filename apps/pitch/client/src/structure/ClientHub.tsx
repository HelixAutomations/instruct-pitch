import React, { useEffect, useState } from 'react';
import DocumentUpload from './DocumentUpload';
import '../styles/ClientHub.css';

interface DocInfo {
    FileName: string;
    BlobUrl: string;
}

interface ClientHubProps {
    instructionRef: string;
    clientId: string;
    passcode: string;
    contactName: string;
    email: string;
}

const ClientHub: React.FC<ClientHubProps> = ({ instructionRef, clientId, passcode, contactName, email }) => {
    const [docs, setDocs] = useState<DocInfo[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [complete, setComplete] = useState(false);
    const [skipped, setSkipped] = useState(false);

    useEffect(() => {
        if (!instructionRef) return;
        fetch(`/api/instruction/${encodeURIComponent(instructionRef)}/documents`)
            .then(res => res.json())
            .then(data => setDocs(Array.isArray(data) ? data : []))
            .catch(err => console.error('doc fetch error', err));
    }, [instructionRef]);

    return (
        <div className="client-hub">
            <h2>Client Hub</h2>
            <div className="hub-grid">
                <div className="hub-item">
                    <div className="label">Instruction Ref</div>
                    <div className="value">{instructionRef}</div>
                </div>
                <div className="hub-item">
                    <div className="label">Client ID</div>
                    <div className="value">{clientId}</div>
                </div>
                {contactName && (
                    <div className="hub-item">
                        <div className="label">Fee Earner</div>
                        <div className="value">{contactName}</div>
                    </div>
                )}
                {email && (
                    <div className="hub-item">
                        <div className="label">Email</div>
                        <div className="value">{email}</div>
                    </div>
                )}
                {docs.length > 0 && (
                    <div className="hub-item docs">
                        <div className="label">Uploaded Documents</div>
                        <ul className="value">
                            {docs.map(d => (
                                <li key={d.BlobUrl}>
                                    <a href={d.BlobUrl} target="_blank" rel="noopener noreferrer">{d.FileName}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                )}
            </div>

            <DocumentUpload
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                setIsComplete={setComplete}
                onBack={() => { }}
                onNext={() => { }}
                setUploadSkipped={setSkipped}
                isUploadSkipped={skipped}
                clientId={clientId}
                passcode={passcode}
                instructionRef={instructionRef}
                instructionReady={true}
                instructionError={null}
            />

            <div className="ccl-section">
                <button className="btn primary" type="button" disabled>
                    CCL in Progress
                </button>
            </div>
        </div>
    );
};

export default ClientHub;
