interface CapabilityModalProps {
    isOpen: boolean;
    id: string;
    content: string;
    loading: boolean;
    onClose: () => void;
  }
  
  const CapabilityModal = ({ isOpen, id, content, loading, onClose }: CapabilityModalProps) => {
    // Helper to escape HTML for code display
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
  
    // Handle click outside to close
    const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };
  
    return (
      <div 
        className={`modal ${isOpen ? 'active' : ''}`} 
        onClick={handleModalClick}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2>{loading ? 'Loading capability...' : `Capability: ${id}`}</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div>
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading capability details...</p>
              </div>
            ) : (
              <div 
                className="code-viewer"
                dangerouslySetInnerHTML={{ 
                  __html: content.startsWith('Error:') ? content : escapeHtml(content) 
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };
  
  export default CapabilityModal;