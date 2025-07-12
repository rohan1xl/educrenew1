// Voice Agent for EduCred platform
// Handles voice recognition and AI-powered intent processing

export interface VoiceCommand {
  intent: 'issue' | 'verify' | 'view' | 'help' | 'unknown';
  entities: {
    studentName?: string;
    course?: string;
    tokenId?: string;
    walletAddress?: string;
  };
  confidence: number;
}

export interface VoiceResponse {
  text: string;
  action?: {
    type: 'navigate' | 'execute' | 'display';
    payload: any;
  };
}

class VoiceAgent {
  private isListening = false;
  private recognition: any = null;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Voice recognition started');
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        console.log('Voice recognition ended');
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
      };
    }
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.start();
    });
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  parseCommand(transcript: string): VoiceCommand {
    const lowerTranscript = transcript.toLowerCase();
    
    // Intent detection patterns
    const patterns = {
      issue: /(?:issue|create|mint|generate)\s+(?:certificate|cert)/i,
      verify: /(?:verify|check|validate)\s+(?:certificate|cert|token)/i,
      view: /(?:show|display|view|see)\s+(?:my\s+)?(?:certificates|certs)/i,
      help: /(?:help|what\s+can\s+you\s+do|commands)/i
    };

    let intent: VoiceCommand['intent'] = 'unknown';
    let confidence = 0;

    // Determine intent
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerTranscript)) {
        intent = key as VoiceCommand['intent'];
        confidence = 0.8;
        break;
      }
    }

    // Extract entities
    const entities: VoiceCommand['entities'] = {};

    // Extract student name
    const nameMatch = lowerTranscript.match(/(?:for|to|student)\s+([a-zA-Z\s]+)/);
    if (nameMatch) {
      entities.studentName = nameMatch[1].trim();
    }

    // Extract course name
    const courseMatch = lowerTranscript.match(/(?:course|class|program)\s+([a-zA-Z\s]+)/);
    if (courseMatch) {
      entities.course = courseMatch[1].trim();
    }

    // Extract token ID
    const tokenMatch = lowerTranscript.match(/(?:token|id)\s+(\d+)/);
    if (tokenMatch) {
      entities.tokenId = tokenMatch[1];
    }

    // Extract wallet address (simplified pattern)
    const walletMatch = lowerTranscript.match(/(0x[a-fA-F0-9]{40})/);
    if (walletMatch) {
      entities.walletAddress = walletMatch[1];
    }

    return {
      intent,
      entities,
      confidence
    };
  }

  generateResponse(command: VoiceCommand): VoiceResponse {
    switch (command.intent) {
      case 'issue':
        if (command.entities.studentName && command.entities.course) {
          return {
            text: `I'll help you issue a certificate for ${command.entities.studentName} for the ${command.entities.course} course. Navigating to the certificate issuance page.`,
            action: {
              type: 'navigate',
              payload: {
                path: '/dashboard/issue-certificate',
                prefill: {
                  studentName: command.entities.studentName,
                  courseName: command.entities.course
                }
              }
            }
          };
        } else {
          return {
            text: "I'll help you issue a certificate. Please provide the student name and course. Navigating to the certificate issuance page.",
            action: {
              type: 'navigate',
              payload: { path: '/dashboard/issue-certificate' }
            }
          };
        }

      case 'verify':
        if (command.entities.tokenId) {
          return {
            text: `I'll verify certificate with token ID ${command.entities.tokenId}. Navigating to the verification page.`,
            action: {
              type: 'navigate',
              payload: {
                path: '/dashboard/verify-certificate',
                prefill: { tokenId: command.entities.tokenId }
              }
            }
          };
        } else if (command.entities.walletAddress) {
          return {
            text: `I'll verify certificates for wallet ${command.entities.walletAddress}. Navigating to the verification page.`,
            action: {
              type: 'navigate',
              payload: {
                path: '/dashboard/verify-certificate',
                prefill: { walletAddress: command.entities.walletAddress }
              }
            }
          };
        } else {
          return {
            text: "I'll help you verify a certificate. Please provide a token ID or wallet address. Navigating to the verification page.",
            action: {
              type: 'navigate',
              payload: { path: '/dashboard/verify-certificate' }
            }
          };
        }

      case 'view':
        return {
          text: "I'll show you your certificates. Navigating to your certificates page.",
          action: {
            type: 'navigate',
            payload: { path: '/dashboard/my-certificate' }
          }
        };

      case 'help':
        return {
          text: `I can help you with the following commands:
          - "Issue certificate for [student name] for [course]" - Create a new certificate
          - "Verify certificate token [number]" - Verify a certificate by token ID
          - "Show my certificates" - View your certificates
          - "Help" - Show this help message
          
          You can also navigate to different sections by saying things like "Go to admin dashboard" or "Show bulk issue page".`,
          action: {
            type: 'display',
            payload: { type: 'help' }
          }
        };

      default:
        return {
          text: "I didn't understand that command. Try saying 'help' to see what I can do, or be more specific about what you'd like to accomplish.",
          action: {
            type: 'display',
            payload: { type: 'error' }
          }
        };
    }
  }

  async processVoiceCommand(): Promise<VoiceResponse> {
    try {
      const transcript = await this.startListening();
      console.log('Voice transcript:', transcript);
      
      const command = this.parseCommand(transcript);
      console.log('Parsed command:', command);
      
      const response = this.generateResponse(command);
      console.log('Generated response:', response);
      
      return response;
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        text: "Sorry, I couldn't understand what you said. Please try again or use the interface directly.",
        action: {
          type: 'display',
          payload: { type: 'error' }
        }
      };
    }
  }

  isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  getListeningState(): boolean {
    return this.isListening;
  }

  // Text-to-speech functionality
  speak(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
}

export const voiceAgent = new VoiceAgent();