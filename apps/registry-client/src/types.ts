export interface Author {
    name: string;
    email?: string;
    url?: string;
  }
  
  export interface ProtocolDetails {
    id: string;
    description?: string;
    version?: string;
    type?: 'atomic' | 'composite';
    authors?: Author[];
  }
  
  export interface Capability {
    id: string;
    description?: string;
    version?: string;
    isAtomic?: boolean;
    protocolDetails: ProtocolDetails;
  }