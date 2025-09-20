import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toggleFavoriteRequestSchema, formatValidationError } from '@/lib/validation';
import { z } from 'zod';
import { withSecurity } from '@/lib/security-middleware';
import { RATE_LIMITS } from '@/lib/rate-limiter';

async function handler(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();

    let validatedData;
    try {
      validatedData = toggleFavoriteRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: formatValidationError(error)
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { videoId, isFavorite } = validatedData;

    const supabase = await createClient();

    // Get current user
    // Authentication is handled by the security middleware
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // This shouldn't happen as middleware checks authentication
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, get the video from video_analyses table using the YouTube ID
    const { data: video, error: videoError } = await supabase
      .from('video_analyses')
      .select('id')
      .eq('youtube_id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Update the favorite status in user_videos table
    const { data, error } = await supabase
      .from('user_videos')
      .update({ is_favorite: isFavorite })
      .eq('user_id', user.id)
      .eq('video_id', video.id)
      .select()
      .single();

    if (error) {
      // If the record doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('user_videos')
          .insert({
            user_id: user.id,
            video_id: video.id,
            is_favorite: isFavorite,
            accessed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        return NextResponse.json({
          success: true,
          isFavorite: newData.is_favorite
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      isFavorite: data.is_favorite
    });

  } catch (error) {
    // Log error details server-side only
    console.error('Error toggling favorite:', error);

    // Return generic error message to client
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, {
  requireAuth: true,
  rateLimit: RATE_LIMITS.AUTH_GENERATION,
  maxBodySize: 1024 * 1024, // 1MB
  allowedMethods: ['POST']
  // CSRF protection not needed as authentication is already required
});