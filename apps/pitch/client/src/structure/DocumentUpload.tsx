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
  FaCaretUp
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
  const [documents, setDocuments] = useState<DocItem[]>(
    uploadedFiles.length
      ? uploadedFiles.map((file, idx) => ({
          id: idx + 1,
          file,
          blobUrl: undefined,
          title: file.name,
          isCollapsed: false,
          isEditing: false
        }))
      : [{ id: 1, title: 'Document 1', isCollapsed: false, isEditing: false }]
  );
  const [supportedOpen, setSupportedOpen] = useState(false);

  // Keep skip logic in sync with file upload
  useEffect(() => {
    const hasFile = documents.some(doc => !!doc.file);
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
    // eslint-disable-next-line
  }, [documents, isUploadSkipped, setUploadedFiles, setIsComplete, setUploadSkipped]);

  const handleFileChange = async (
    id: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    formData.append('instructionId', instructionId);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDocuments((docs) =>
        docs.map((doc) =>
          doc.id === id
            ? { ...doc, file, title: file.name, blobUrl: data.url }
            : doc
        )
      );
    } catch (err) {
      console.error('Upload error', err);
    }

  };

  const startEditing = (id: number) =>
    setDocuments((docs) =>
      docs.map((doc) => ({ ...doc, isEditing: doc.id === id }))
    );

  const saveTitle = (id: number, newTitle: string) =>
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === id
          ? { ...doc, title: newTitle || doc.title, isEditing: false }
          : doc
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

  const allFilesUploaded = documents.every((d) => !!d.file);

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
                onChange={(e) => saveTitle(doc.id, e.target.value)}
                onBlur={() => saveTitle(doc.id, doc.title)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && e.currentTarget.blur()
                }
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
            {doc.file && <span className="completion-tick">✔</span>}
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
              {doc.file && (
                <div className="file-list-item">{doc.file.name}</div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        className="add-document-button"
        onClick={addDocument}
        disabled={isUploadSkipped}
      >
        <FaPlus /> Add another document
      </button>

      {/* Supported file types toggle */}
      <div
        className="supported-toggle"
        onClick={() => setSupportedOpen(!supportedOpen)}
      >
        <span>Supported file types</span>
        {supportedOpen
          ? <FaCaretUp className="toggle-icon" />
          : <FaCaretDown className="toggle-icon" />
        }
      </div>

      {/* Animated file‑type bubble */}
      {supportedOpen && (
        <div className="file-type-bubble supported-list open">
          {/* Documents first */}
          <span className="file-type-icon" data-tooltip="PDF (.pdf)">
            <FaFilePdf />
          </span>
          <span className="file-type-icon" data-tooltip="Word (.doc, .docx)">
            <FaFileWord />
          </span>
          <span className="file-type-icon" data-tooltip="Excel (.xls, .xlsx)">
            <FaFileExcel />
          </span>
          <span className="file-type-icon" data-tooltip="PowerPoint (.ppt, .pptx)">
            <FaFilePowerpoint />
          </span>
          {/* Images & text */}
          <span className="file-type-icon" data-tooltip="Image (.jpg, .png)">
            <FaFileImage />
          </span>
          <span className="file-type-icon" data-tooltip="Text (.txt)">
            <FaFileAlt />
          </span>
          {/* Archives next */}
          <span className="file-type-icon" data-tooltip="Archive (.zip, .rar)">
            <FaFileArchive />
          </span>
          {/* Media last */}
          <span className="file-type-icon" data-tooltip="Video (.mp4)">
            <FaFileVideo />
          </span>
          <span className="file-type-icon" data-tooltip="Audio (.mp3)">
            <FaFileAudio />
          </span>
        </div>
      )}

      <div className="button-group">
        <button
          type="button"
          className="btn secondary"
          onClick={onBack}
          aria-label="Go back to document upload"
        >
          Back
        </button>
        {documents.every((d) => !d.file) && !isUploadSkipped ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setUploadSkipped(true);
              setIsComplete(true);
              setUploadedFiles([]);
              onNext();
            }}
          >
            Skip
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={onNext}
            aria-label="Proceed to next step"
            disabled={!documents.every((d) => !!d.file)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
