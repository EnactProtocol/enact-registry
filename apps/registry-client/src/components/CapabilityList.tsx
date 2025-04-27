import { Capability, ProtocolDetails } from '../types';

interface CapabilityListProps {
  capabilities: Capability[];
  loading: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

const CapabilityList = ({ capabilities, loading, onView, onDelete }: CapabilityListProps) => {
  // Render authors list
  const renderAuthors = (authors: { name: string }[] = []) => {
    if (!authors || authors.length === 0) {
      return 'Unknown author';
    }
    
    if (authors.length === 1) {
      return `Author: ${authors[0].name}`;
    }
    
    return `Authors: ${authors.map(author => author.name).join(', ')}`;
  };

  if (loading) {
    return (
      <div className="capability-list">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading capabilities...</p>
        </div>
      </div>
    );
  }

  if (!capabilities || capabilities.length === 0) {
    return (
      <div className="capability-list">
        <div className="no-capabilities">
          <p>No capabilities found. Upload your first capability!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="capability-list">
      {capabilities.map(capability => {
        const protocolDetails = capability.protocolDetails || capability;


        return (
          <div className="capability-card" key={protocolDetails.id} data-id={protocolDetails.id}>
            <div className="capability-header">
              <div>
                <span className="capability-name">{protocolDetails.id}</span>
                <span className={`capability-type atomic`}>
                  {'verified'}
                </span>
              </div>
              <span className="capability-version">v{protocolDetails.version || '1.0.0'}</span>
            </div>
            <div className="capability-description">
              {protocolDetails.description || 'No description'}
            </div>
            <div className="capability-authors">
              {renderAuthors((protocolDetails as ProtocolDetails).authors || [])}
            </div>
            <div className="capability-actions">
              <span 
                className="capability-action" 
                onClick={() => onView(protocolDetails.id)}
              >
                View
              </span>
              <span 
                className="capability-action" 
                onClick={() => onDelete(protocolDetails.id)}
              >
                Delete
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CapabilityList;