import { PhoneUtils } from '../phone';

describe('PhoneUtils', () => {
  describe('isValidPhoneNumber', () => {
    it('should validate correct international phone numbers', () => {
      expect(PhoneUtils.isValidPhoneNumber('+1234567890')).toBe(true);
      expect(PhoneUtils.isValidPhoneNumber('+44123456789')).toBe(true);
      expect(PhoneUtils.isValidPhoneNumber('+919876543210')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(PhoneUtils.isValidPhoneNumber('1234567890')).toBe(false); // No +
      expect(PhoneUtils.isValidPhoneNumber('+0123456789')).toBe(false); // Starts with 0
      expect(PhoneUtils.isValidPhoneNumber('+123')).toBe(false); // Too short
      expect(PhoneUtils.isValidPhoneNumber('')).toBe(false); // Empty
      expect(PhoneUtils.isValidPhoneNumber('+123456789012345678')).toBe(false); // Too long
    });

    it('should handle null and undefined inputs', () => {
      expect(PhoneUtils.isValidPhoneNumber(null as any)).toBe(false);
      expect(PhoneUtils.isValidPhoneNumber(undefined as any)).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(PhoneUtils.isValidPhoneNumber(123 as any)).toBe(false);
      expect(PhoneUtils.isValidPhoneNumber({} as any)).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone numbers correctly', () => {
      expect(PhoneUtils.formatPhoneNumber('+1 234 567 890')).toBe('+1234567890');
      expect(PhoneUtils.formatPhoneNumber('+44-123-456-789')).toBe('+44123456789');
      expect(PhoneUtils.formatPhoneNumber('+91 (987) 654-3210')).toBe('+919876543210');
    });

    it('should add + prefix when missing', () => {
      expect(PhoneUtils.formatPhoneNumber('1234567890')).toBe('+1234567890');
    });

    it('should handle 00 prefix', () => {
      expect(PhoneUtils.formatPhoneNumber('001234567890')).toBe('+1234567890');
    });

    it('should throw error for invalid formats', () => {
      expect(() => PhoneUtils.formatPhoneNumber('123')).toThrow('Invalid phone number format');
      expect(() => PhoneUtils.formatPhoneNumber('')).toThrow('Phone number is required');
      expect(() => PhoneUtils.formatPhoneNumber('abc')).toThrow('Invalid phone number format');
    });

    it('should preserve already formatted numbers', () => {
      expect(PhoneUtils.formatPhoneNumber('+1234567890')).toBe('+1234567890');
    });
  });

  describe('getCountryCode', () => {
    it('should extract country codes correctly', () => {
      expect(PhoneUtils.getCountryCode('+1234567890')).toBe('1');
      expect(PhoneUtils.getCountryCode('+44123456789')).toBe('44');
      expect(PhoneUtils.getCountryCode('+919876543210')).toBe('91');
    });

    it('should handle formatted numbers', () => {
      expect(PhoneUtils.getCountryCode('+1 234 567 890')).toBe('1');
      expect(PhoneUtils.getCountryCode('44-123-456-789')).toBe('44');
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask phone numbers correctly', () => {
      expect(PhoneUtils.maskPhoneNumber('+1234567890')).toBe('*******7890');
      expect(PhoneUtils.maskPhoneNumber('+44123456789')).toBe('********6789');
    });

    it('should handle short numbers', () => {
      expect(PhoneUtils.maskPhoneNumber('+123')).toBe('+123');
      expect(PhoneUtils.maskPhoneNumber('+1234')).toBe('+1234');
    });

    it('should handle formatted numbers', () => {
      expect(PhoneUtils.maskPhoneNumber('+1 234 567 890')).toBe('*******7890');
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate 6-digit codes', () => {
      const code = PhoneUtils.generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });

    it('should generate different codes', () => {
      const code1 = PhoneUtils.generateVerificationCode();
      const code2 = PhoneUtils.generateVerificationCode();
      // While theoretically possible to be the same, it's extremely unlikely
      expect(code1).not.toBe(code2);
    });

    it('should generate codes in valid range', () => {
      for (let i = 0; i < 10; i++) {
        const code = PhoneUtils.generateVerificationCode();
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('isValidVerificationCode', () => {
    it('should validate correct verification codes', () => {
      expect(PhoneUtils.isValidVerificationCode('123456')).toBe(true);
      expect(PhoneUtils.isValidVerificationCode('000000')).toBe(true);
      expect(PhoneUtils.isValidVerificationCode('999999')).toBe(true);
    });

    it('should reject invalid verification codes', () => {
      expect(PhoneUtils.isValidVerificationCode('12345')).toBe(false); // Too short
      expect(PhoneUtils.isValidVerificationCode('1234567')).toBe(false); // Too long
      expect(PhoneUtils.isValidVerificationCode('12345a')).toBe(false); // Contains letter
      expect(PhoneUtils.isValidVerificationCode('')).toBe(false); // Empty
      expect(PhoneUtils.isValidVerificationCode('12 34 56')).toBe(false); // Contains spaces
    });
  });
});