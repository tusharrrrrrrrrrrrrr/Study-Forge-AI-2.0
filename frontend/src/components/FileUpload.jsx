import { useState, useRef } from 'react';
import { api } from '../utils/api';
import TreeBookAnimation from './animations/TreeBookAnimation';

export default function FileUpload({ workspaceId, onUploadComplete, showToast }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please upload a PDF file.', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast('File too large. Maximum size is 50MB.', 'error');
      return;
    }

    setUploading(true);
    setProgress(10);
    setStatus('Uploading PDF...');

    let intervalId;
    try {
      intervalId = setInterval(() => {
        setProgress((p) => {
            if (p < 30) {
                setStatus('Extracting text and structure...');
                return p + 5;
            }
            if (p === 30) {
                setStatus('Generating Deep Master Context (this takes a moment)...');
                return 40;
            }
            if (p < 90) return p + 2;
            return p;
        });
      }, 500);

      const result = await api.uploadPDF(workspaceId, file);

      clearInterval(intervalId);
      setProgress(100);
      setStatus('Done! 🎉');

      setTimeout(() => {
        onUploadComplete(result);
      }, 600);
    } catch (err) {
      if (intervalId) clearInterval(intervalId);
      showToast(`Upload failed: ${err.message}`, 'error');
      setUploading(false);
      setProgress(0);
      setStatus('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Upload PDF</h1>
          <div className="subtitle">Upload a textbook, notes, or research paper to start studying</div>
        </div>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFile(e.target.files[0])}
          style={{ display: 'none' }}
        />

        {!uploading ? (
          <>
            <span className="upload-icon">📄</span>
            <div className="upload-title">Drop your PDF here or click to browse</div>
            <div className="upload-subtitle">
              Supports textbooks, notes, research papers — up to 50MB
            </div>
          </>
        ) : (
          <div className="upload-progress">
            {progress >= 40 && progress < 100 ? (
                <TreeBookAnimation />
            ) : (
                <span className="upload-icon">⚙️</span>
            )}
            <div className="upload-title">{status}</div>
            <div className="progress-bar" style={{ marginTop: 16 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="upload-subtitle" style={{ marginTop: 8 }}>
              {progress}% complete
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Your PDF will be processed, chunked, and indexed for AI-powered study features.
        </p>
      </div>
    </>
  );
}
