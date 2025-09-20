import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withSecurity, SECURITY_PRESETS } from '@/lib/security-middleware';

async function handler(req: NextRequest) {
  try {
    const {
      videoId,
      summary,
      suggestedQuestions
    } = await req.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update the existing video analysis with summary and/or suggested questions
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (suggestedQuestions !== undefined) {
      updateData.suggested_questions = suggestedQuestions;
    }

    const { data: updatedVideo, error: updateError } = await supabase
      .from('video_analyses')
      .update(updateData)
      .eq('youtube_id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating video analysis:', updateError);
      return NextResponse.json(
        { error: 'Failed to update video analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedVideo
    });

  } catch (error) {
    console.error('Error in update video analysis:', error);
    return NextResponse.json(
      { error: 'Failed to process update request' },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, SECURITY_PRESETS.PUBLIC);