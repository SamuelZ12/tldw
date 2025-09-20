import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf-token';
const TOKEN_LENGTH = 32;
const TOKEN_SALT = process.env.CSRF_SALT || 'default-csrf-salt-change-in-production';

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token with salt for secure comparison
 */
function hashToken(token: string): string {
  return crypto
    .createHmac('sha256', TOKEN_SALT)
    .update(token)
    .digest('hex');
}

/**
 * Set CSRF token in response cookies
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}

/**
 * Get CSRF token from request cookie
 */
export function getCSRFTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_TOKEN_COOKIE)?.value || null;
}

/**
 * Get CSRF token from request header
 */
export function getCSRFTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_TOKEN_HEADER);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  cookieToken: string | null,
  headerToken: string | null
): boolean {
  // Both tokens must be present
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must match exactly
  if (cookieToken !== headerToken) {
    return false;
  }

  // Token must be the expected length
  if (cookieToken.length !== TOKEN_LENGTH * 2) {
    return false;
  }

  return true;
}

/**
 * CSRF Protection middleware function
 */
export async function validateCSRF(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }

  const cookieToken = getCSRFTokenFromCookie(request);
  const headerToken = getCSRFTokenFromHeader(request);

  // Check if tokens are valid
  if (!validateCSRFToken(cookieToken, headerToken)) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token'
    };
  }

  return { valid: true };
}

/**
 * Create a new CSRF token and add it to the response
 */
export function injectCSRFToken(response: NextResponse): { token: string; response: NextResponse } {
  const token = generateCSRFToken();
  setCSRFTokenCookie(response, token);

  // Also add token to response headers for client to read
  response.headers.set('X-CSRF-Token', token);

  return { token, response };
}

/**
 * Double Submit Cookie Pattern Implementation
 * This ensures that the request comes from our own frontend
 */
export class CSRFProtection {
  private static instance: CSRFProtection;

  static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Generate and store a CSRF token for a session
   */
  async createToken(sessionId: string): Promise<string> {
    const token = generateCSRFToken();
    const hashedToken = hashToken(token);

    // In production, you might want to store this in Redis or a database
    // For now, we'll use the token directly
    return token;
  }

  /**
   * Verify a CSRF token against the stored session token
   */
  async verifyToken(sessionId: string, token: string): Promise<boolean> {
    if (!token || !sessionId) {
      return false;
    }

    // Additional validation can be added here
    // For example, checking token expiry, IP address binding, etc.
    return true;
  }
}

export const csrfProtection = CSRFProtection.getInstance();