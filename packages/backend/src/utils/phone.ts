/**
 * Phone number validation and formatting utilities
 */
export class PhoneUtils {
  // Basic phone number regex - supports international format with country code
  private static readonly PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
  
  // Common country code patterns for additional validation
  private static readonly COUNTRY_CODES = {
    US: /^\+1[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    UK: /^\+44[1-9]\d{8,9}$/,
    IN: /^\+91[6-9]\d{9}$/,
    // Add more as needed
  };

  /**
   * Validate phone number format
   * Expects international format with country code (e.g., +1234567890)
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    // Remove any whitespace
    const cleanNumber = phoneNumber.trim();
    
    // Check basic international format
    return this.PHONE_REGEX.test(cleanNumber);
  }

  /**
   * Format phone number to standard international format
   * Removes spaces, dashes, and ensures + prefix
   */
  static formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      // If it starts with 00, replace with +
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
      } else {
        // Assume it needs a + prefix
        cleaned = '+' + cleaned;
      }
    }

    if (!this.isValidPhoneNumber(cleaned)) {
      throw new Error('Invalid phone number format. Use international format with country code (e.g., +1234567890)');
    }

    return cleaned;
  }

  /**
   * Extract country code from phone number
   */
  static getCountryCode(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber);
    
    // Extract country code (1-4 digits after +)
    const match = formatted.match(/^\+(\d{1,4})/);
    return match ? match[1] : '';
  }

  /**
   * Mask phone number for display (show only last 4 digits)
   */
  static maskPhoneNumber(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber);
    const length = formatted.length;
    
    if (length <= 4) {
      return formatted;
    }
    
    const masked = '*'.repeat(length - 4) + formatted.slice(-4);
    return masked;
  }

  /**
   * Generate a random verification code
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate verification code format
   */
  static isValidVerificationCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }
}