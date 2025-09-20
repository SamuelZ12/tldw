import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { withSecurity, SECURITY_PRESETS } from '@/lib/security-middleware';

async function handler(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    // Use appropriate rate limit config based on auth status
    const rateLimitConfig = user ? RATE_LIMITS.AUTH_GENERATION : RATE_LIMITS.ANON_GENERATION;

    // Use the peek method to check rate limit without consuming it
    const rateLimitResult = await RateLimiter.peek('video-analysis', rateLimitConfig);

    return NextResponse.json({
      canGenerate: rateLimitResult.allowed,
      isAuthenticated: !!user,
      remaining: rateLimitResult.remaining,
      limit: rateLimitConfig.maxRequests,
      resetAt: rateLimitResult.resetAt.toISOString(),
      windowMs: rateLimitConfig.windowMs
    });

  } catch (error) {
    // Log error details server-side only
    console.error('Error checking generation limit:', error);

    // Return generic error message to client
    return NextResponse.json(
      { error: 'An error occurred while checking limits' },
      { status: 500 }
    );
  }
}

export const GET = withSecurity(handler, SECURITY_PRESETS.PUBLIC);