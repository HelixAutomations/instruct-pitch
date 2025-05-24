import React, { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaFileUpload,
  FaPlus,
  FaEdit,
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileAlt,
  FaFileAudio,
  FaFileVideo,
  FaCaretDown,
  FaCaretUp,
  FaSyncAlt
} from 'react-icons/fa';
import '../styles/DocumentUpload.css';

interface DocumentUploadProps {
  uploadedFiles: File[];
  setUploadedFiles: Dispatch<SetStateAction<File[]>>;
  setIsComplete: Dispatch<SetStateAction<boolean>>;
  onBack: () => void;
  onNext: () => void;
  setUploadSkipped: Dispatch<SetStateAction<boolean>>;
  isUploadSkipped: boolean;
  clientId: string;
  instructionId: string;
}

interface DocItem {
  id: number;
  file?: File;
  blobUrl?: string;
  title: string;
  isCollapsed: boolean;
  isEditing: boolean;
  isUploading?: boolean;
  hasError?: boolean;
}

const iconMap: Record<string, React.ReactElement> = {
  pdf: <FaFilePdf className="section-icon" />,
  doc: <FaFileWord className="section-icon" />,
  docx: <FaFileWord className="section-icon" />,
  xls: <FaFileExcel className="section-icon" />,
  xlsx: <FaFileExcel className="section-icon" />,
  ppt: <FaFilePowerpoint className="section-icon" />,
  pptx: <FaFilePowerpoint className="section-icon" />,
  txt: <FaFileAlt className="section-icon" />,
  zip: <FaFileArchive className="section-icon" />,
  rar: <FaFileArchive className="section-icon" />,
  jpg: <FaFileImage className="section-icon" />,
  jpeg: <FaFileImage className="section-icon" />,
  png: <FaFileImage className="section-icon" />,
  mp3: <FaFileAudio className="section-icon" />,
  mp4: <FaFileVideo className="section-icon" />
};

const getFileIcon = (file?: File) => {
  if (!file) return <FaFileUpload className="section-icon" />;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return iconMap[ext] || <FaFileAlt className="section-icon" />;
};

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  uploadedFiles,
  setUploadedFiles,
  setIsComplete,
  onBack,
  onNext,
  setUploadSkipped,
  isUploadSkipped,
  clientId,
  instructionId
}) => {
  const storageKey = `uploadedDocs-${clientId}-${instructionId}`;
  const [documents, setDocuments] = useState<DocItem[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        try {
          const arr = JSON.parse(cached) as { title: string; blobUrl: string }[];
          return arr.map((item, idx) => ({
            id: idx + 1,
            title: item.title,
            blobUrl: item.blobUrl,
            isCollapsed: false,
            isEditing: false,
          }));
        } catch {
          // ignore parse errors
        }
      }
    }
    return uploadedFiles.length

      ? uploadedFiles.map((file, idx) => ({
          id: idx + 1,
          file,
          blobUrl: undefined,
          title: file.name,
          isCollapsed: false,
          isEditing: false,
        }))
      : [{ id: 1, title: 'Document 1', isCollapsed: false, isEditing: false }];
  });
  const saveCache = (docs: DocItem[]) => {
    if (typeof window === 'undefined') return;
    const data = docs
      .filter((d) => d.blobUrl)
      .map((d) => ({ title: d.title, blobUrl: d.blobUrl }));
    sessionStorage.setItem(storageKey, JSON.stringify(data));
  };
  const [supportedOpen, setSupportedOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const hasFile = documents.some(doc => !!doc.file || !!doc.blobUrl);
    if (hasFile) {
      setUploadSkipped(false);
      setIsComplete(true);
      setUploadedFiles(documents.filter(d => d.file).map(d => d.file!));
    } else if (isUploadSkipped) {
      setIsComplete(true);
      setUploadedFiles([]);
    } else {
      setIsComplete(false);
      setUploadedFiles([]);
    }
  }, [documents, isUploadSkipped, setUploadedFiles, setIsComplete, setUploadSkipped]);

  const handleFileChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              file,
              title: file.name,
              blobUrl: undefined,
              hasError: false,
            }
          : doc
      )
    );
  };

  const uploadSingleFile = async (doc: DocItem) => {
    if (!doc.file) return doc;
    const prefix = window.location.pathname.startsWith('/pitch') ? '/pitch' : '';
    const formData = new FormData();
    formData.append('file', doc.file);
    formData.append('clientId', clientId);
    formData.append('instructionId', instructionId);

    try {
      const res = await fetch(`${prefix}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return { ...doc, blobUrl: data.url, isUploading: false, hasError: false };
    } catch (err) {
      console.error('❌ Upload failed for', doc.title, err);
      return { ...doc, isUploading: false, hasError: true };
    }
  };

  const handleRetry = async (id: number) => {
    setDocuments((docs) =>
      docs.map((doc) => doc.id === id ? { ...doc, isUploading: true, hasError: false } : doc)
    );
    const targetDoc = documents.find((d) => d.id === id);
    if (targetDoc) {
      const updated = await uploadSingleFile({ ...targetDoc, isUploading: true });
      setDocuments((docs) => {
        const newDocs = docs.map((doc) => (doc.id === id ? updated : doc));
        saveCache(newDocs);
        return newDocs;
      });
    }
  };

  const handleNext = async () => {
    setUploading(true);
    const updatedDocs = await Promise.all(
      documents.map((doc) => {
        if (doc.blobUrl || !doc.file) return Promise.resolve(doc);
        return uploadSingleFile({ ...doc, isUploading: true });
      })
    );
    setDocuments(updatedDocs);
    saveCache(updatedDocs);
    setUploading(false);

    const anyFailures = updatedDocs.some((doc) => doc.hasError);
    if (!anyFailures) onNext();
  };

  const startEditing = (id: number) =>
    setDocuments((docs) =>
      docs.map((doc) => ({ ...doc, isEditing: doc.id === id }))
    );

  const updateTitle = (id: number, newTitle: string) =>
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === id ? { ...doc, title: newTitle } : doc
      )
    );

  const saveTitle = (id: number) =>
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === id ? { ...doc, isEditing: false } : doc
      )
    );

  const toggleCollapse = (id: number) =>
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === id ? { ...doc, isCollapsed: !doc.isCollapsed } : doc
      )
    );

  const addDocument = () =>
    setDocuments((docs) => [
      ...docs,
      {
        id: docs.length + 1,
        title: `Document ${docs.length + 1}`,
        isCollapsed: false,
        isEditing: false
      }
    ]);

  return (
    <div className="form-container apple-form document-upload">
      {documents.map((doc) => (
        <div key={doc.id} className="form-group-section">
          <div
            className="group-header"
            onClick={() => toggleCollapse(doc.id)}
          >
            {getFileIcon(doc.file)}
            {doc.isEditing ? (
              <input
                type="text"
                className="edit-input"
                value={doc.title}
                onChange={(e) => updateTitle(doc.id, e.target.value)}
                onBlur={() => saveTitle(doc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveTitle(doc.id);
                  }
                }}
                autoFocus
              />
            ) : (
              <span className="document-title">{doc.title}</span>
            )}
            <FaEdit
              className="edit-icon"
              onClick={(e) => {
                e.stopPropagation();
                startEditing(doc.id);
              }}
            />
            {doc.isUploading && <span className="spinner" style={{ marginLeft: 8 }}><FaSyncAlt className="spin" /></span>}
            {!doc.isUploading && doc.file && !doc.hasError && <span className="completion-tick">✔</span>}
            {doc.hasError && <span style={{ color: 'red' }}>✖</span>}
            {doc.isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </div>

          {!doc.isCollapsed && (
            <div className="form-group">
              <label className="upload-button" htmlFor={`fileUpload-${doc.id}`}>
                <FaFileUpload className="upload-button-icon" />
                {doc.file ? 'Change file' : 'Choose file'}
              </label>
              <input
                id={`fileUpload-${doc.id}`}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.png,.mp3,.mp4"
                className="file-input-hidden"
                onChange={(e) => handleFileChange(doc.id, e)}
              />
              {(doc.file || doc.blobUrl) && (
                <div className="file-list-item">
                  {doc.file ? doc.file.name : doc.title}
                  {doc.blobUrl && !doc.hasError && (
                    <span className="upload-status">Uploaded ✓</span>
                  )}
                  {doc.hasError && (
                    <span style={{ color: 'red', marginLeft: 8 }}>
                      – upload failed
                      <button onClick={() => handleRetry(doc.id)} style={{ marginLeft: 6 }}>
                        Retry
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        className="add-document-button"
        onClick={addDocument}
        disabled={isUploadSkipped || uploading}
      >
        <FaPlus /> Add another document
      </button>

      <div className="supported-toggle" onClick={() => setSupportedOpen(!supportedOpen)}>
        <span>Supported file types</span>
        {supportedOpen ? <FaCaretUp className="toggle-icon" /> : <FaCaretDown className="toggle-icon" />}
      </div>

      {supportedOpen && (
        <div className="file-type-bubble supported-list open">
          <span className="file-type-icon" data-tooltip="PDF (.pdf)"><FaFilePdf /></span>
          <span className="file-type-icon" data-tooltip="Word (.doc, .docx)"><FaFileWord /></span>
          <span className="file-type-icon" data-tooltip="Excel (.xls, .xlsx)"><FaFileExcel /></span>
          <span className="file-type-icon" data-tooltip="PowerPoint (.ppt, .pptx)"><FaFilePowerpoint /></span>
          <span className="file-type-icon" data-tooltip="Image (.jpg, .png)"><FaFileImage /></span>
          <span className="file-type-icon" data-tooltip="Text (.txt)"><FaFileAlt /></span>
          <span className="file-type-icon" data-tooltip="Archive (.zip, .rar)"><FaFileArchive /></span>
          <span className="file-type-icon" data-tooltip="Video (.mp4)"><FaFileVideo /></span>
          <span className="file-type-icon" data-tooltip="Audio (.mp3)"><FaFileAudio /></span>
        </div>
      )}

      <div className="button-group">
        <button
          type="button"
          className="btn secondary"
          onClick={onBack}
          aria-label="Go back to document upload"
          disabled={uploading}
        >
          Back
        </button>
        {documents.every((d) => !d.file && !d.blobUrl) && !isUploadSkipped ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setUploadSkipped(true);
              setIsComplete(true);
              setUploadedFiles([]);
              onNext();
            }}
            disabled={uploading}
          >
            Skip
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={handleNext}
            aria-label="Proceed to next step"
            disabled={uploading || !documents.every((d) => !!d.file || !!d.blobUrl)}
          >
            {uploading ? 'Uploading...' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;