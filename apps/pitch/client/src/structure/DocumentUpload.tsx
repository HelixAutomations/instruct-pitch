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
import { CSSTransition } from "react-transition-group";

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
  passcode: string;
  instructionRef: string;
  instructionReady: boolean;
  instructionError?: string | null;
}

interface DocItem {
  id: number;
  file?: File;
  blobUrl?: string;
  title: string;
  isCollapsed: boolean;
  isUploading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  isEditing?: boolean;
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

const getFileNameWithoutExtension = (name?: string) => {
  if (!name) return '';
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
};

// --- Supported File Types Info ---
function SupportedFileTypesInfo() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="supported-types-center-wrap">
      <button
        className="supported-types-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        type="button"
      >
        Supported file types
        {open ? <FaCaretUp /> : <FaCaretDown />}
      </button>
      <CSSTransition
        in={open}
        timeout={250}
        classNames="supported-type-icons-anim"
        unmountOnExit
      >
        <div className="supported-type-icons">
          <span className="file-type-icon" title="PDF (.pdf)"><FaFilePdf /></span>
          <span className="file-type-icon" title="Word (.doc, .docx)"><FaFileWord /></span>
          <span className="file-type-icon" title="Excel (.xls, .xlsx)"><FaFileExcel /></span>
          <span className="file-type-icon" title="PowerPoint (.ppt, .pptx)"><FaFilePowerpoint /></span>
          <span className="file-type-icon" title="Image (.jpg, .png)"><FaFileImage /></span>
          <span className="file-type-icon" title="Text (.txt)"><FaFileAlt /></span>
          <span className="file-type-icon" title="Archive (.zip, .rar)"><FaFileArchive /></span>
          <span className="file-type-icon" title="Video (.mp4)"><FaFileVideo /></span>
          <span className="file-type-icon" title="Audio (.mp3)"><FaFileAudio /></span>
        </div>
      </CSSTransition>
    </div>
  );
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  uploadedFiles,
  setUploadedFiles,
  setIsComplete,
  onBack,
  onNext,
  setUploadSkipped,
  isUploadSkipped,
  clientId,
  passcode,
  instructionRef,
  instructionReady,
  instructionError
}) => {
  const [documents, setDocuments] = useState<DocItem[]>(() =>
    uploadedFiles.length
      ? uploadedFiles.map((uf, idx) => ({
          id: idx + 1,
          file: uf.file,
          blobUrl: uf.uploaded ? 'uploaded' : undefined,
          title: uf.file.name,
          isCollapsed: false,
          isEditing: false,
          errorMessage: undefined
        }))
      : []
  );
  const [uploading, setUploading] = useState(false);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const allUploaded =
    documents.length > 0 &&
    documents.every(d => (!!d.blobUrl || !d.file) && !d.hasError);
  const readyToSubmit = isUploadSkipped || allUploaded;

  if (!instructionReady) {
    return (
      <div className="form-container apple-form document-upload">
        <p>Setting up your instruction...</p>
        {instructionError && <p className="upload-error">{instructionError}</p>}
        <div className="button-group">
          <button type="button" className="btn secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const uploaded = documents.filter(d => d.blobUrl && !d.hasError);
    const allSuccess =
      uploaded.length > 0 &&
      documents.every(d => (!!d.blobUrl || !d.file) && !d.hasError);

    if (isUploadSkipped || allSuccess) {
      setIsComplete(true);
      sessionStorage.setItem(
        `uploadedDocs-${passcode}-${instructionRef}`,
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
  }, [documents, isUploadSkipped, setUploadedFiles, setIsComplete, setUploadSkipped, clientId, passcode, instructionRef]);

  // Add new files to the document list
  const addExtraDocuments = (files: File[]) =>
    setDocuments(docs => [
      ...docs,
      ...files.map((f, idx) => ({
        id: docs.length + idx + 1,
        file: f,
        title: f.name,
        isCollapsed: true,
        isEditing: false,
        errorMessage: undefined
      }))
    ]);

  // Remove a file row
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
      return remaining.map((d, idx) => ({ ...d, id: idx + 1 }));
    });
  };

  // Upload logic
  const uploadSingleFile = async (doc: DocItem) => {
    if (!doc.file) return doc;
    const formData = new FormData();
    formData.append('file', doc.file);
    formData.append('clientId', clientId);
    formData.append('passcode', passcode);
    formData.append('instructionRef', instructionRef);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadedFiles(prev =>
        prev.map(u => (u.file === doc.file ? { ...u, uploaded: true } : u))
      );
      return {
        ...doc,
        blobUrl: data.url,
        isUploading: false,
        hasError: false,
        errorMessage: undefined,
      };
    } catch (err) {
      console.error('❌ Upload failed for', doc.title, err);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return { ...doc, isUploading: false, hasError: true, errorMessage: msg };
    }
  };

  const handleRetry = async (id: number) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id
          ? { ...doc, isUploading: true, hasError: false, errorMessage: undefined }
          : doc
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

  // ---- Inline rename/edit handlers ----

  const handleFileNameClick = (id: number) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id ? { ...doc, isEditing: true } : { ...doc, isEditing: false }
      )
    );
  };

  const handleFileNameChange = (id: number, value: string) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id ? { ...doc, title: value } : doc
      )
    );
  };

  const handleFileNameBlur = (id: number) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id ? { ...doc, isEditing: false } : doc
      )
    );
  };

  const handleFileNameKeyDown = (id: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      handleFileNameBlur(id);
    }
  };

  // ---- Render ----
  return (
    <div className="form-container apple-form document-upload">

      {/* 1. Render selected/uploaded files at the top */}
      <div className="documents-list">
        {documents.filter(doc => doc.file).map(doc => {
          const fileBaseName = getFileNameWithoutExtension(doc.file?.name ?? '');
          const showDraftStyle =
            !doc.title ||
            doc.title.trim() === '' ||
            doc.title === doc.file?.name ||
            doc.title === fileBaseName;

          return (
            <div key={doc.id} className="file-row file-row-list-item">
              <span className="section-icon" style={{ fontSize: 36 }}>
                {getFileIcon(doc.file)}
              </span>
              {doc.isEditing ? (
                <input
                  className="title-input"
                  type="text"
                  autoFocus
                  value={doc.title ? getFileNameWithoutExtension(doc.title) : fileBaseName}
                  onChange={e => handleFileNameChange(doc.id, e.target.value)}
                  onBlur={() => handleFileNameBlur(doc.id)}
                  onKeyDown={e => handleFileNameKeyDown(doc.id, e)}
                  maxLength={80}
                  style={{ minWidth: 80, fontSize: 16, fontWeight: 500 }}
                  title={doc.file?.name}
                />
              ) : (
                <span
                  className={
                    "file-name" +
                    (showDraftStyle ? " draft-rename" : "")
                  }
                  title={doc.file?.name}
                  tabIndex={0}
                  onClick={() => handleFileNameClick(doc.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleFileNameClick(doc.id);
                    }
                  }}
                  style={{ userSelect: "text" }}
                >
                  {doc.title
                    ? getFileNameWithoutExtension(doc.title)
                    : fileBaseName}
                </span>
              )}
              {doc.isUploading && (
                <span className="spinner">
                  <FaSyncAlt className="spin" />
                </span>
              )}
              {doc.blobUrl && !doc.hasError && (
                <span className="upload-status">Uploaded</span>
              )}
              {doc.hasError && !doc.isUploading && (
                <span className="upload-error">
                  – {doc.errorMessage || 'upload failed'}
                  <button
                    onClick={() => handleRetry(doc.id)}
                    className="retry-button"
                    style={{ marginLeft: 6 }}
                  >
                    Retry
                  </button>
                </span>
              )}
              <FaTimes className="remove-icon" onClick={() => removeFile(doc.id)} />
            </div>
          );
        })}
      </div>

      {/* 2. Dropzone (dotted area) BELOW the file list */}
      <div className="form-group">
        <label
          className={
            `upload-button${dragOverId === 0 ? ' drag-over' : ''}` +
            (documents.length === 0 ? ' pulse' : '')
          }
          htmlFor="fileUpload"
          onDragOver={e => { e.preventDefault(); setDragOverId(0); }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={e => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            if (!files.length) return;
            addExtraDocuments(files);
            setDragOverId(null);
          }}
        >
          <FaFileUpload className="upload-button-icon" />
          <span className="upload-button-text">
            {documents.length === 0 ? "Upload your first file" : "Upload another file"}
          </span>
        </label>
        <input
          id="fileUpload"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.png,.mp3,.mp4"
          className="file-input-hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []);
            if (files.length) addExtraDocuments(files);
            e.target.value = '';
          }}
        />
      </div>

      <SupportedFileTypesInfo />

      <div className="button-group">
        <button type="button" className="btn secondary" onClick={onBack} disabled={uploading}>
          Back
        </button>
        {documents.length === 0 && !isUploadSkipped ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setUploadSkipped(true);
              setIsComplete(true);
              sessionStorage.setItem(`uploadedDocs-${passcode}-${instructionRef}`, 'true');
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
            disabled={uploading || !documents.every(d => !!d.file || !!d.blobUrl)}
          >
            {uploading ? 'Uploading...' : readyToSubmit ? 'Submit' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
