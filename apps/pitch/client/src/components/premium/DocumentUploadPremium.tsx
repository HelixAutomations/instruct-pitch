import React, { useState, useEffect, useCallback } from 'react';
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
  FaTimes,
  FaSyncAlt,
  FaCheck
} from 'react-icons/fa';
import './DocumentUploadPremium.css';

interface UploadedFile {
  file: File;
  uploaded: boolean;
}

interface DocumentUploadPremiumProps {
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
  isUploading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  isEditing?: boolean;
  uploadProgress?: number;
}

// Enhanced file type detection
const getFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext;
};

const getFileIcon = (file: File | undefined) => {
  if (!file) return <FaFileAlt className="file-icon" />;
  
  const ext = getFileExtension(file.name);
  const iconMap: Record<string, React.ReactElement> = {
    pdf: <FaFilePdf className="file-icon pdf" />,
    doc: <FaFileWord className="file-icon word" />,
    docx: <FaFileWord className="file-icon word" />,
    xls: <FaFileExcel className="file-icon excel" />,
    xlsx: <FaFileExcel className="file-icon excel" />,
    ppt: <FaFilePowerpoint className="file-icon powerpoint" />,
    pptx: <FaFilePowerpoint className="file-icon powerpoint" />,
    jpg: <FaFileImage className="file-icon image" />,
    jpeg: <FaFileImage className="file-icon image" />,
    png: <FaFileImage className="file-icon image" />,
    gif: <FaFileImage className="file-icon image" />,
    txt: <FaFileAlt className="file-icon text" />,
    zip: <FaFileArchive className="file-icon archive" />,
    rar: <FaFileArchive className="file-icon archive" />,
    '7z': <FaFileArchive className="file-icon archive" />,
    mp3: <FaFileAudio className="file-icon audio" />,
    wav: <FaFileAudio className="file-icon audio" />,
    mp4: <FaFileVideo className="file-icon video" />,
    avi: <FaFileVideo className="file-icon video" />,
    mov: <FaFileVideo className="file-icon video" />,
  };
  
  return iconMap[ext] || <FaFileAlt className="file-icon default" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileNameWithoutExtension = (name: string): string => {
  if (!name) return '';
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
};

const DocumentUploadPremium: React.FC<DocumentUploadPremiumProps> = ({
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
          isEditing: false,
          errorMessage: undefined,
          uploadProgress: uf.uploaded ? 100 : 0
        }))
      : []
  );
  
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showSupportedTypes, setShowSupportedTypes] = useState(false);
  
  const allUploaded = documents.length > 0 && documents.every(d => (!!d.blobUrl || !d.file) && !d.hasError);
  const readyToSubmit = isUploadSkipped || allUploaded;

  // Enhanced drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addNewDocuments(files);
    }
  }, []);

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = new Set([
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'txt', 'zip', 'rar', '7z', 'jpg', 'jpeg', 'png', 'gif',
      'mp3', 'wav', 'mp4', 'avi', 'mov'
    ]);
    
    const ext = getFileExtension(file.name);
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    if (!allowedTypes.has(ext)) {
      return { valid: false, error: 'File type not supported' };
    }
    
    return { valid: true };
  };

  // Add new files with validation
  const addNewDocuments = (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });
    
    if (errors.length > 0) {
      alert('Some files were not added:\n' + errors.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setDocuments(docs => [
        ...docs,
        ...validFiles.map((f, idx) => ({
          id: docs.length + idx + 1,
          file: f,
          title: f.name,
          isEditing: false,
          errorMessage: undefined,
          uploadProgress: 0
        }))
      ]);
    }
  };

  // Enhanced upload with progress tracking
  const uploadSingleFile = async (doc: DocItem): Promise<DocItem> => {
    if (!doc.file) return doc;
    
    const formData = new FormData();
    formData.append('file', doc.file);
    formData.append('clientId', clientId);
    formData.append('passcode', passcode);
    formData.append('instructionRef', instructionRef);

    try {
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setDocuments(docs =>
              docs.map(d => d.id === doc.id ? { ...d, uploadProgress: progress } : d)
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              setUploadedFiles(prev =>
                prev.map(u => (u.file === doc.file ? { ...u, uploaded: true } : u))
              );
              resolve({
                ...doc,
                blobUrl: data.url,
                isUploading: false,
                hasError: false,
                errorMessage: undefined,
                uploadProgress: 100
              });
            } catch (parseErr) {
              reject(new Error('Invalid server response'));
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    } catch (err) {
      console.error('❌ Upload failed for', doc.title, err);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return { ...doc, isUploading: false, hasError: true, errorMessage: msg, uploadProgress: 0 };
    }
  };

  // Remove file handler
  const removeFile = (id: number) => {
    const target = documents.find(d => d.id === id);
    if (target?.blobUrl) {
      if (!window.confirm('This file was already uploaded. Removing it will delete it from our system. Continue?')) {
        return;
      }
    }
    setDocuments(docs => {
      const remaining = docs.filter(d => d.id !== id);
      return remaining.map((d, idx) => ({ ...d, id: idx + 1 }));
    });
  };

  // Retry upload handler
  const handleRetry = async (id: number) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id
          ? { ...doc, isUploading: true, hasError: false, errorMessage: undefined, uploadProgress: 0 }
          : doc
      )
    );
    
    const target = documents.find(d => d.id === id);
    if (target) {
      const updated = await uploadSingleFile({ ...target, isUploading: true });
      setDocuments(docs => docs.map(doc => (doc.id === id ? updated : doc)));
    }
  };

  // Handle next/upload all
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

  // File editing handlers
  const handleFileNameClick = (id: number) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id ? { ...doc, isEditing: true } : { ...doc, isEditing: false }
      )
    );
  };

  const handleFileNameChange = (id: number, value: string) => {
    setDocuments(docs =>
      docs.map(doc => doc.id === id ? { ...doc, title: value } : doc)
    );
  };

  const handleFileNameBlur = (id: number) => {
    setDocuments(docs =>
      docs.map(doc => doc.id === id ? { ...doc, isEditing: false } : doc)
    );
  };

  const handleFileNameKeyDown = (id: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      handleFileNameBlur(id);
    }
  };

  // Update completion status
  useEffect(() => {
    const uploaded = documents.filter(d => d.blobUrl && !d.hasError);
    const allSuccess = uploaded.length > 0 && documents.every(d => (!!d.blobUrl || !d.file) && !d.hasError);

    if (isUploadSkipped || allSuccess) {
      setIsComplete(true);
      sessionStorage.setItem(`uploadedDocs-${passcode}-${instructionRef}`, 'true');
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
  }, [documents, isUploadSkipped, setUploadedFiles, setIsComplete, setUploadSkipped, passcode, instructionRef]);

  if (!instructionReady) {
    return (
      <div className="document-upload-premium">
        <div className="loading-state">
          <div className="loading-spinner">
            <FaSyncAlt className="spin" />
          </div>
          <h3>Setting up your instruction...</h3>
          {instructionError && <p className="error-message">{instructionError}</p>}
        </div>
        <div className="action-buttons">
          <button type="button" className="premium-button premium-button--secondary premium-button--nav premium-button--clean" onClick={onBack}>
            <span>Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-upload-premium">
      {/* Upload Area */}
      <div 
          className={`upload-zone ${dragOver ? 'drag-over' : ''} ${documents.length === 0 ? 'empty' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            id="fileUpload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi,.mov"
            className="file-input-hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) addNewDocuments(files);
              e.target.value = '';
            }}
          />
          
          <label htmlFor="fileUpload" className="upload-label">
            <div className="upload-content">
              <FaFileUpload className="upload-icon" />
              <h3>{documents.length === 0 ? 'Upload your first document' : 'Add more documents'}</h3>
              <p>Drag and drop files here, or click to browse</p>
              <div className="upload-limits">
                <span>Maximum file size: 10MB</span>
                <button 
                  type="button"
                  className="supported-types-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowSupportedTypes(!showSupportedTypes);
                  }}
                >
                  {showSupportedTypes ? 'Hide' : 'View'} supported formats
                </button>
              </div>
            </div>
          </label>
        </div>

        {/* Supported File Types */}
        {showSupportedTypes && (
          <div className="supported-types">
            <h4>Supported File Types</h4>
            <div className="file-types-grid">
              <div className="file-type-group">
                <span className="group-title">Documents</span>
                <div className="file-type-list">
                  <span className="file-type"><FaFilePdf />PDF</span>
                  <span className="file-type"><FaFileWord />Word</span>
                  <span className="file-type"><FaFileExcel />Excel</span>
                  <span className="file-type"><FaFilePowerpoint />PowerPoint</span>
                  <span className="file-type"><FaFileAlt />Text</span>
                </div>
              </div>
              <div className="file-type-group">
                <span className="group-title">Media</span>
                <div className="file-type-list">
                  <span className="file-type"><FaFileImage />Images</span>
                  <span className="file-type"><FaFileAudio />Audio</span>
                  <span className="file-type"><FaFileVideo />Video</span>
                  <span className="file-type"><FaFileArchive />Archives</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Files List */}
        {documents.length > 0 && (
          <div className="files-list">
            <h3>Uploaded Documents ({documents.length})</h3>
            {documents.map(doc => {
              const fileBaseName = getFileNameWithoutExtension(doc.file?.name ?? '');
              const showDraftStyle = !doc.title || doc.title.trim() === '' || doc.title === doc.file?.name || doc.title === fileBaseName;
              
              return (
                <div key={doc.id} className="file-item">
                  <div className="file-info">
                    <div className="file-icon-container">
                      {getFileIcon(doc.file)}
                    </div>
                    
                    <div className="file-details">
                      {doc.isEditing ? (
                        <input
                          className="file-name-input"
                          type="text"
                          autoFocus
                          value={doc.title ? getFileNameWithoutExtension(doc.title) : fileBaseName}
                          onChange={(e) => handleFileNameChange(doc.id, e.target.value)}
                          onBlur={() => handleFileNameBlur(doc.id)}
                          onKeyDown={(e) => handleFileNameKeyDown(doc.id, e)}
                          maxLength={80}
                        />
                      ) : (
                        <button
                          className={`file-name ${showDraftStyle ? 'draft' : ''}`}
                          onClick={() => handleFileNameClick(doc.id)}
                          title="Click to rename"
                        >
                          {doc.title ? getFileNameWithoutExtension(doc.title) : fileBaseName}
                        </button>
                      )}
                      
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(doc.file?.size || 0)}</span>
                        <span className="file-extension">.{getFileExtension(doc.file?.name || '')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="file-status">
                    {doc.isUploading && (
                      <div className="upload-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${doc.uploadProgress || 0}%` }}
                          />
                        </div>
                        <span className="progress-text">{Math.round(doc.uploadProgress || 0)}%</span>
                      </div>
                    )}
                    
                    {doc.blobUrl && !doc.hasError && (
                      <div className="upload-success">
                        <FaCheck className="success-icon" />
                        <span>Uploaded</span>
                      </div>
                    )}
                    
                    {doc.hasError && !doc.isUploading && (
                      <div className="upload-error">
                        <span className="error-text">{doc.errorMessage || 'Upload failed'}</span>
                        <button
                          onClick={() => handleRetry(doc.id)}
                          className="retry-btn"
                        >
                          <FaSyncAlt />
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeFile(doc.id)}
                    className="remove-btn"
                    title="Remove file"
                  >
                    <FaTimes />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            type="button" 
            className="premium-button premium-button--secondary premium-button--nav premium-button--clean" 
            onClick={onBack}
            disabled={uploading}
          >
            <span>Back</span>
          </button>
          
          {documents.length === 0 && !isUploadSkipped ? (
            <button
              type="button"
              className="premium-button premium-button--secondary premium-button--nav premium-button--clean"
              onClick={() => {
                setUploadSkipped(true);
                setIsComplete(true);
                sessionStorage.setItem(`uploadedDocs-${passcode}-${instructionRef}`, 'true');
                setUploadedFiles([]);
                onNext();
              }}
              disabled={uploading}
            >
              <span>Skip Upload</span>
            </button>
          ) : (
            <button
              type="button"
              className="premium-button premium-button--primary premium-button--nav premium-button--clean"
              onClick={handleNext}
              disabled={uploading || !documents.every(d => !!d.file || !!d.blobUrl)}
            >
              <span>
                {uploading ? 'Uploading...' : readyToSubmit ? 'Continue' : 'Upload & Continue'}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

export default DocumentUploadPremium;
