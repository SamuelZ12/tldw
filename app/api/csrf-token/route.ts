import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFTokenCookie } from '@/lib/csrf-protection';
import { withSecurity } from '@/lib/security-middleware';

/**
 * Endpoint to get a CSRF token for authenticated sessions
 */
async function handler(request: NextRequest) {
  const token = generateCSRFToken();
  const response = NextResponse.json({ success: true });

  // Set token in both cookie and header
  setCSRFTokenCookie(response, token);
  response.headers.set('X-CSRF-Token', token);

  return response;
}

// Only authenticated users need CSRF tokens
export const GET = withSecurity(handler, {
  requireAuth: true,
  allowedMethods: ['GET']
});