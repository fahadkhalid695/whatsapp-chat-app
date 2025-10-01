import { config } from '../config';
import { PhoneUtils } from '../utils/phone';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS verification service with mock implementation for development
 */
export class SMSService {
  /**
   * Send verification code via SMS
   */
  static async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const formattedPhone = PhoneUtils.formatPhoneNumber(phoneNumber);
    
    if (config.sms.provider === 'mock' || config.server.nodeEnv === 'development') {
      return this.mockSendSMS(formattedPhone, code);
    }
    
    // In production, integrate with real SMS provider (Twilio, AWS SNS, etc.)
    return this.sendRealSMS(formattedPhone, code);
  }

  /**
   * Mock SMS sending for development
   */
  private static async mockSendSMS(phoneNumber: string, code: string): Promise<SMSResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Log the verification code for development
    console.log(`📱 Mock SMS to ${phoneNumber}: Your verification code is ${code}`);
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      return {
        success: false,
        error: 'Mock SMS delivery failed',
      };
    }
    
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Real SMS sending implementation (placeholder)
   * In production, integrate with services like Twilio, AWS SNS, etc.
   */
  private static async sendRealSMS(phoneNumber: string, code: string): Promise<SMSResult> {
    try {
      // Example Twilio integration (commented out - requires actual credentials)
      /*
      const twilio = require('twilio');
      const client = twilio(config.sms.apiKey, config.sms.apiSecret);
      
      const message = await client.messages.create({
        body: `Your WhatsApp Chat verification code is: ${code}`,
        from: '+1234567890', // Your Twilio phone number
        to: phoneNumber,
      });
      
      return {
        success: true,
        messageId: message.sid,
      };
      */
      
      // For now, throw error if trying to use real SMS without implementation
      throw new Error('Real SMS provider not configured. Set SMS_PROVIDER=mock for development.');
      
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error',
      };
    }
  }

  /**
   * Validate SMS provider configuration
   */
  static validateConfiguration(): boolean {
    if (config.sms.provider === 'mock') {
      return true;
    }
    
    // Check if real SMS provider credentials are configured
    return !!(config.sms.apiKey && config.sms.apiSecret);
  }
}