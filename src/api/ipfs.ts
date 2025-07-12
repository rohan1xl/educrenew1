// Mock IPFS service for demonstration
// In production, you would use Web3.Storage or Pinata

export interface IPFSUploadResult {
  cid: string;
  url: string;
  size: number;
}

export interface IPFSMetadata {
  name: string;
  description: string;
  image?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  certificate_data: {
    student_name: string;
    course: string;
    institution: string;
    completion_date: string;
    grade: string;
    certificate_hash: string;
  };
}

class IPFSService {
  private baseUrl = 'https://ipfs.io/ipfs/';
  private mockCIDs: string[] = [
    'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
    'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
    'QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWkLHmLpXhF68A',
    'QmSsYRx3LpDAb1GZQm7zZ1AuHZjfbPkD6J9s9r1DGCo8mA',
    'QmTzQ1JRkWErjk39mryYw2WVaphAZNAREyMchXzBpbgvL3'
  ];

  private generateMockCID(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'Qm';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async uploadFile(file: File): Promise<IPFSUploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const cid = this.generateMockCID();
    
    return {
      cid,
      url: `${this.baseUrl}${cid}`,
      size: file.size
    };
  }

  async uploadJSON(metadata: IPFSMetadata): Promise<IPFSUploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const cid = this.generateMockCID();
    const jsonString = JSON.stringify(metadata, null, 2);
    
    return {
      cid,
      url: `${this.baseUrl}${cid}`,
      size: new Blob([jsonString]).size
    };
  }

  async fetchMetadata(cid: string): Promise<IPFSMetadata> {
    // Simulate fetch delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock metadata
    return {
      name: "AI Workshop Certificate",
      description: "Certificate of completion for AI Workshop",
      attributes: [
        { trait_type: "Course", value: "Artificial Intelligence Workshop" },
        { trait_type: "Institution", value: "QUIN Academy" },
        { trait_type: "Grade", value: "A+" },
        { trait_type: "Completion Date", value: "2024-01-15" }
      ],
      certificate_data: {
        student_name: "Keerthana",
        course: "Artificial Intelligence Workshop",
        institution: "QUIN Academy",
        completion_date: "2024-01-15",
        grade: "A+",
        certificate_hash: "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      }
    };
  }

  getIPFSUrl(cid: string): string {
    return `${this.baseUrl}${cid}`;
  }

  async pinFile(cid: string): Promise<boolean> {
    // Simulate pinning delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
}

export const ipfsService = new IPFSService();