import React, { useState, useEffect } from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  FaFileUpload,
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
  FaTimes,
  FaSyncAlt
} from 'react-icons/fa';
import '../styles/DocumentUpload.css';

interface UploadedFile {
  file: File;
  uploaded: boolean;
}

interface DocumentUploadProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
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
  const [documents, setDocuments] = useState<DocItem[]>(() =>
    uploadedFiles.length
      ? uploadedFiles.map((uf, idx) => ({
          id: idx + 1,
          file: uf.file,
          blobUrl: uf.uploaded ? 'uploaded' : undefined,
          title: uf.file.name,
          isCollapsed: false
        }))
      : [{ id: 1, title: 'Document 1', isCollapsed: false }]
  );
  const [supportedOpen, setSupportedOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // Sync uploadedFiles prop/state
  useEffect(() => {
    const uploaded = documents.filter(d => d.blobUrl && !d.hasError);
    const allSuccess =
      uploaded.length > 0 &&
      documents.every(d => (!!d.blobUrl || !d.file) && !d.hasError);

    if (isUploadSkipped || allSuccess) {
      setIsComplete(true);
      sessionStorage.setItem(
        `uploadedDocs-${clientId}-${instructionId}`,
        'true'
      );
    } else {
      setIsComplete(false);
    }

    if (documents.some(doc => !!doc.file || !!doc.blobUrl)) {
      setUploadSkipped(false);
    }

    setUploadedFiles(
      documents
        .filter(d => d.file)
        .map(d => ({ file: d.file!, uploaded: !!d.blobUrl }))
    );
  }, [documents, isUploadSkipped, setUploadedFiles, setIsComplete, setUploadSkipped, clientId, instructionId]);

  // Add new empty document slot if all slots are filled
  useEffect(() => {
    if (documents.every(d => d.file || d.blobUrl)) {
      setDocuments(docs => [
        ...docs,
        { id: docs.length + 1, title: `Document ${docs.length + 1}`, isCollapsed: false }
      ]);
    }
  }, [documents]);

  // Handlers
  const handleFileChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id
          ? { ...doc, file, title: file.name, blobUrl: undefined, hasError: false, isCollapsed: true }
          : doc
      )
    );
    e.target.value = '';
  };

  const addExtraDocuments = (files: File[]) =>
    setDocuments(docs => [
      ...docs,
      ...files.map((f, idx) => ({
        id: docs.length + idx + 1,
        file: f,
        title: f.name,
        isCollapsed: true
      }))
    ]);

  // Per-document drag & drop
  const handleDragOver = (id: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (id: number, e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    const [first, ...rest] = dropped;
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id
          ? { ...doc, file: first, title: first.name, blobUrl: undefined, hasError: false, isCollapsed: true }
          : doc
      )
    );
    if (rest.length) addExtraDocuments(rest);
    setDragOverId(null);
  };

  const removeFile = (id: number) => {
    const target = documents.find(d => d.id === id);
    if (target?.blobUrl) {
      if (
        !window.confirm(
          'This file was already uploaded. Removing it will delete it from our system. Continue?'
        )
      ) {
        return;
      }
    }
    setDocuments(docs => {
      const remaining = docs.filter(d => d.id !== id);
      if (remaining.length === 0) {
        return [{ id: 1, title: 'Document 1', isCollapsed: false }];
      }
      return remaining.map((d, idx) => ({ ...d, id: idx + 1 }));
    });
  };

  const uploadSingleFile = async (doc: DocItem) => {
    if (!doc.file) return doc;
    const formData = new FormData();
    formData.append('file', doc.file);
    formData.append('clientId', clientId);
    formData.append('instructionId', instructionId);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedFiles(prev =>
        prev.map(u => (u.file === doc.file ? { ...u, uploaded: true } : u))
      );
      return { ...doc, blobUrl: data.url, isUploading: false, hasError: false };
    } catch (err) {
      console.error('❌ Upload failed for', doc.title, err);
      return { ...doc, isUploading: false, hasError: true };
    }
  };

  const handleRetry = async (id: number) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id ? { ...doc, isUploading: true, hasError: false } : doc
      )
    );
    const target = documents.find(d => d.id === id);
    if (target) {
      const updated = await uploadSingleFile({ ...target, isUploading: true });
      setDocuments(docs => docs.map(doc => (doc.id === id ? updated : doc)));
    }
  };

  const handleNext = async () => {
    setUploading(true);
    const updatedDocs = await Promise.all(
      documents.map(doc =>
        doc.blobUrl || !doc.file
          ? Promise.resolve(doc)
          : uploadSingleFile({ ...doc, isUploading: true })
      )
    );
    setDocuments(updatedDocs);
    setUploadedFiles(
      updatedDocs
        .filter(d => d.file)
        .map(d => ({ file: d.file!, uploaded: !!d.blobUrl }))
    );
    setUploading(false);

    if (!updatedDocs.some(doc => doc.hasError)) {
      onNext();
    }
  };

  // UI
  return (
    <div className="form-container apple-form document-upload">
      <div className="documents-list">
        {documents.map(doc => (
          <div key={doc.id} className="file-row">
            {getFileIcon(doc.file)}
            <span className="file-name">{doc.file ? doc.file.name : doc.title}</span>
            <label
              className={`upload-button${dragOverId === doc.id ? ' drag-over' : ''}`}
              htmlFor={`fileUpload-${doc.id}`}
              onDragOver={e => handleDragOver(doc.id, e)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(doc.id, e)}
            >
              <FaFileUpload className="upload-button-icon" />
              <span className="upload-button-text">Drag &amp; drop or click to upload</span>
            </label>
            <input
              id={`fileUpload-${doc.id}`}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.png,.mp3,.mp4"
              className="file-input-hidden"
              onChange={e => handleFileChange(doc.id, e)}
            />
            {doc.isUploading && (
              <span className="spinner" style={{ marginLeft: 8 }}>
                <FaSyncAlt className="spin" />
              </span>
            )}
            {doc.blobUrl && !doc.hasError && <span className="upload-status">Uploaded</span>}
            {doc.hasError && !doc.isUploading && (
              <span style={{ color: 'red', marginLeft: 8 }}>
                – upload failed
                <button
                  onClick={() => handleRetry(doc.id)}
                  style={{ marginLeft: 6 }}
                  className="retry-button"
                >
                  Retry
                </button>
              </span>
            )}
            <FaTimes className="remove-icon" onClick={() => removeFile(doc.id)} />
          </div>
        ))}
      </div>

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
        {documents.every(d => !d.file && !d.blobUrl) && !isUploadSkipped ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setUploadSkipped(true);
              setIsComplete(true);
              sessionStorage.setItem(`uploadedDocs-${clientId}-${instructionId}`, 'true');
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
            disabled={
              uploading || !documents.every(d => !!d.file || !!d.blobUrl)
            }
          >
            {uploading ? 'Uploading...' : 'Next'}
          </button>
        )}
        <button type="button" className="btn secondary" onClick={onBack} disabled={uploading}>
          Back
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;
