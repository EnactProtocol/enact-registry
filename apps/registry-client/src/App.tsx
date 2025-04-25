import { useState, useEffect } from 'react';
import './App.css';
import { Capability } from './types'
import SearchBar from './components/SearchBar'
import CapabilityList from './components/CapabilityList'
import Tabs from './components/Tab'
import Notification from './components/Notification';
import UploadPanel from './components/UploadPanel'
import CapabilityModal from './components/CapabilityModal'

// Base URL for API
const API_BASE_URL = 'http://localhost:8081/api';

function App() {
  // State
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [modalData, setModalData] = useState<{ isOpen: boolean; id: string; content: string; loading: boolean }>({
    isOpen: false,
    id: '',
    content: '',
    loading: false
  });

  // Load capabilities on mount
  useEffect(() => {
    loadCapabilities();
  }, []);

  // Load capabilities from API
  const loadCapabilities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/registry`);
      const data = await response.json();
      
      if (data.capabilities && data.capabilities.length > 0) {
        setCapabilities(data.capabilities);
      } else {
        setCapabilities([]);
      }
    } catch (error) {
      console.error('Error loading capabilities:', error);
      showNotification('Error loading capabilities. Please try again.', 'error');
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  };

  // Search capabilities
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      loadCapabilities();
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/registry/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Convert search results to capability format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const searchResults = data.results.map((result: any) => ({
          id: result.id,
          description: result.description,
          version: result.version,
          isAtomic: result.type === 'atomic',
          protocolDetails: {
            id: result.id,
            description: result.description,
            version: result.version,
            type: result.type,
            // Other fields might be missing in search results
            authors: [{ name: 'Author' }] // Placeholder
          }
        }));
        
        setCapabilities(searchResults);
      } else {
        setCapabilities([]);
      }
    } catch (error) {
      console.error('Error searching capabilities:', error);
      showNotification('Error searching capabilities. Please try again.', 'error');
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  };

  // View capability details
  const viewCapability = async (id: string) => {
    try {
      setModalData({
        isOpen: true,
        id,
        content: '',
        loading: true
      });
      
      const response = await fetch(`${API_BASE_URL}/capabilities/${id}?raw=true`);
      
      if (response.ok) {
        const content = await response.text();
        setModalData(prev => ({
          ...prev,
          content,
          loading: false
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load capability details');
      }
    } catch (error) {
      console.error('Error viewing capability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setModalData(prev => ({
        ...prev,
        content: `Error: ${errorMessage}`,
        loading: false
      }));
    }
  };

  // Delete capability
  const deleteCapability = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete capability "${id}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/registry/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showNotification('Capability deleted successfully!', 'success');
        loadCapabilities();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete capability');
      }
    } catch (error) {
      console.error('Error deleting capability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error deleting capability: ${errorMessage}`, 'error');
    }
  };

  // Upload capability
  const uploadCapability = async (content: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: content
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showNotification('Capability uploaded successfully!', 'success');
        setActiveTab('browse');
        loadCapabilities();
        return true;
      } else {
        throw new Error(data.message || 'Failed to upload capability');
      }
    } catch (error) {
      console.error('Error uploading capability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error uploading capability: ${errorMessage}`, 'error');
      return false;
    }
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <div className="container">
      <header>
        <h1>Enact Protocol Registry <span className="badge">Alpha</span></h1>
        <div className="header-actions">
          <button onClick={loadCapabilities} className="btn">Refresh</button>
        </div>
      </header>

      <SearchBar onSearch={performSearch} />

      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'browse' ? (
        <div className="panel active" id="browse-panel">
          <CapabilityList
            capabilities={capabilities}
            loading={loading}
            onView={viewCapability}
            onDelete={deleteCapability}
          />
        </div>
      ) : (
        <div className="panel active" id="upload-panel">
          <UploadPanel onUpload={uploadCapability} />
        </div>
      )}

      <footer className="footer">
        <p>Enact Protocol Registry &copy; 2025</p>
      </footer>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
        />
      )}

      <CapabilityModal
        isOpen={modalData.isOpen}
        id={modalData.id}
        content={modalData.content}
        loading={modalData.loading}
        onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App;