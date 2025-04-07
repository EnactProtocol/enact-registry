import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface UploadPanelProps {
  onUpload: (content: string) => Promise<boolean>;
}

const UploadPanel = ({ onUpload }: UploadPanelProps) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHighlighted(true);
  };

  const handleDragLeave = () => {
    setIsHighlighted(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHighlighted(false);
    
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      alert('Please select a YAML file (.yaml or .yml)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!fileContent) {
      alert('No file content to upload');
      return;
    }
    
    const success = await onUpload(fileContent);
    if (success) {
      cancelUpload();
    }
  };

  const cancelUpload = () => {
    setFileContent(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      {!fileContent ? (
        <div 
          className={`upload-area ${isHighlighted ? 'highlight' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h3>Drag & Drop Your YAML File Here</h3>
          <p>or</p>
          <button 
            className="btn" 
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </button>
          <input 
            type="file"
            ref={fileInputRef}
            className="file-input"
            accept=".yaml,.yml"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div id="filePreview">
          <h3>File Preview</h3>
          <div className="code-viewer">
            {fileContent}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-success" onClick={handleUpload}>
              Upload Capability
            </button>
            <button className="btn btn-danger" onClick={cancelUpload}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPanel;