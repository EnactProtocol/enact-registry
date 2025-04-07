interface TabsProps {
    activeTab: 'browse' | 'upload';
    onTabChange: (tab: 'browse' | 'upload') => void;
  }
  
  const Tabs = ({ activeTab, onTabChange }: TabsProps) => {
    return (
      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'browse' ? 'active' : ''}`} 
          onClick={() => onTabChange('browse')}
        >
          Browse Capabilities
        </div>
        <div 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`} 
          onClick={() => onTabChange('upload')}
        >
          Upload Capability
        </div>
      </div>
    );
  };
  
  export default Tabs;