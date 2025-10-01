import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { JWTPayload } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        code: 'AUTH_004',
      });
      return;
    }
    
    const payload = JWTUtils.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_003',
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);
    
    if (token) {
      const payload = JWTUtils.verifyAccessToken(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Middleware to check if user owns the resource
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_004',
      });
      return;
    }
    
    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.user.userId !== resourceUserId) {
      res.status(403).json({
        error: 'Access denied - insufficient permissions',
        code: 'AUTH_005',
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate request body against schema
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((detail: any) => detail.message),
        code: 'VALIDATION_ERROR',
      });
      return;
    }
    
    next();
  };
};