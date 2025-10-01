import { AuthService } from '../auth';
import { SMSService } from '../sms';
import { DatabaseConnection } from '../../database/connection';

// Mock dependencies
jest.mock('../sms');
jest.mock('../../database/connection');

const mockSMSService = SMSService as jest.Mocked<typeof SMSService>;
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>;

describe('AuthService', () => {
  const mockPhoneNumber = '+1234567890';
  const mockDisplayName = 'Test User';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.clearVerificationSessions();
    
    // Mock database instance
    const mockDb = {
      query: jest.fn(),
    };
    mockDatabaseConnection.getInstance.mockReturnValue(mockDb as any);
  });

  describe('initiatePhoneVerification', () => {
    it('should create verification session and send SMS', async () => {
      mockSMSService.sendVerificationCode.mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      });

      const result = await AuthService.initiatePhoneVerification(mockPhoneNumber);

      expect(result).toHaveProperty('verificationId');
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Verification code sent successfully');
      expect(mockSMSService.sendVerificationCode).toHaveBeenCalledWith(
        mockPhoneNumber,
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it('should throw error if SMS sending fails', async () => {
      mockSMSService.sendVerificationCode.mockResolvedValue({
        success: false,
        error: 'SMS service unavailable',
      });

      await expect(
        AuthService.initiatePhoneVerification(mockPhoneNumber)
      ).rejects.toThrow('Failed to send verification code: SMS service unavailable');
    });

    it('should format phone number before processing', async () => {
      mockSMSService.sendVerificationCode.mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      });

      await AuthService.initiatePhoneVerification('+1 234 567 890');

      expect(mockSMSService.sendVerificationCode).toHaveBeenCalledWith(
        '+1234567890',
        expect.any(String)
      );
    });

    it('should throw error for invalid phone number', async () => {
      await expect(
        AuthService.initiatePhoneVerification('invalid-phone')
      ).rejects.toThrow('Invalid phone number format');
    });
  });

  describe('verifyCodeAndAuthenticate', () => {
    let verificationId: string;
    let verificationCode: string;

    beforeEach(async () => {
      mockSMSService.sendVerificationCode.mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      });

      const result = await AuthService.initiatePhoneVerification(mockPhoneNumber);
      verificationId = result.verificationId;
      
      // Get the verification code from the session
      const session = AuthService.getVerificationSession(verificationId);
      verificationCode = session!.code;
    });

    it('should authenticate existing user', async () => {
      // Mock existing user
      const mockDb = mockDatabaseConnection.getInstance();
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: mockUserId,
            phone_number: mockPhoneNumber,
            display_name: mockDisplayName,
            profile_picture: null,
            status: 'Available',
            last_seen: new Date(),
            is_online: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: mockUserId,
            phone_number: mockPhoneNumber,
            display_name: mockDisplayName,
            profile_picture: null,
            status: 'Available',
            last_seen: new Date(),
            is_online: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      const result = await AuthService.verifyCodeAndAuthenticate(
        verificationId,
        verificationCode,
        mockDisplayName
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.id).toBe(mockUserId);
      expect(result.user.phoneNumber).toBe(mockPhoneNumber);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should create new user if not exists', async () => {
      // Mock no existing user, then successful creation
      const mockDb = mockDatabaseConnection.getInstance();
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({
          rows: [{
            id: mockUserId,
            phone_number: mockPhoneNumber,
            display_name: mockDisplayName,
            profile_picture: null,
            status: 'Available',
            last_seen: new Date(),
            is_online: true,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      const result = await AuthService.verifyCodeAndAuthenticate(
        verificationId,
        verificationCode,
        mockDisplayName
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.phoneNumber).toBe(mockPhoneNumber);
      expect(result.user.displayName).toBe(mockDisplayName);
    });

    it('should throw error for invalid verification ID', async () => {
      await expect(
        AuthService.verifyCodeAndAuthenticate(
          'invalid-id',
          verificationCode,
          mockDisplayName
        )
      ).rejects.toThrow('Invalid or expired verification session');
    });

    it('should throw error for invalid verification code', async () => {
      await expect(
        AuthService.verifyCodeAndAuthenticate(
          verificationId,
          '000000',
          mockDisplayName
        )
      ).rejects.toThrow('Invalid verification code');
    });

    it('should throw error for expired session', async () => {
      // Manually expire the session
      const session = AuthService.getVerificationSession(verificationId);
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000); // 1 second ago
      }

      await expect(
        AuthService.verifyCodeAndAuthenticate(
          verificationId,
          verificationCode,
          mockDisplayName
        )
      ).rejects.toThrow('Verification code has expired');
    });

    it('should limit verification attempts', async () => {
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          await AuthService.verifyCodeAndAuthenticate(
            verificationId,
            '000000',
            mockDisplayName
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // 4th attempt should be blocked
      await expect(
        AuthService.verifyCodeAndAuthenticate(
          verificationId,
          '000000',
          mockDisplayName
        )
      ).rejects.toThrow('Too many verification attempts');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', async () => {
      // First, create a user and get tokens
      mockSMSService.sendVerificationCode.mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      });

      const verifyResult = await AuthService.initiatePhoneVerification(mockPhoneNumber);
      const session = AuthService.getVerificationSession(verifyResult.verificationId);
      
      const mockDb = mockDatabaseConnection.getInstance();
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: mockUserId,
          phone_number: mockPhoneNumber,
          display_name: mockDisplayName,
          profile_picture: null,
          status: 'Available',
          last_seen: new Date(),
          is_online: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      const authResult = await AuthService.verifyCodeAndAuthenticate(
        verifyResult.verificationId,
        session!.code,
        mockDisplayName
      );

      // Now test refresh
      const newAccessToken = await AuthService.refreshAccessToken(authResult.tokens.refreshToken);
      
      expect(typeof newAccessToken).toBe('string');
      expect(newAccessToken).not.toBe(authResult.tokens.accessToken);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(
        AuthService.refreshAccessToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should update user last seen on logout', async () => {
      const mockDb = mockDatabaseConnection.getInstance();
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: mockUserId,
          phone_number: mockPhoneNumber,
          display_name: mockDisplayName,
          profile_picture: null,
          status: 'Available',
          last_seen: new Date(),
          is_online: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      await expect(AuthService.logout(mockUserId)).resolves.not.toThrow();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [mockUserId]
      );
    });
  });
});