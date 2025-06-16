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
            <div className="hub-details">
                <p><strong>Instruction Ref:</strong> {instructionRef}</p>
                <p><strong>Client ID:</strong> {clientId}</p>
                {contactName && <p><strong>Fee Earner:</strong> {contactName}</p>}
                {email && <p><strong>Email:</strong> {email}</p>}
            </div>

            <div className="existing-docs">
                <h3>Uploaded Documents</h3>
                {docs.length ? (
                    <ul>
                        {docs.map(d => (
                            <li key={d.BlobUrl}>
                                <a href={d.BlobUrl} target="_blank" rel="noopener noreferrer">{d.FileName}</a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No documents uploaded yet.</p>
                )}
            </div>

            <div className="upload-new">
                <h3>Upload Additional Documents</h3>
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
            </div>

            <div className="ccl-section">
                <button className="btn primary" type="button" disabled>
                    CCL in Progress
                </button>
            </div>
        </div>
    );
};

export default ClientHub;
