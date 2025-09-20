import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranscriptSegment } from '@/lib/types';
import { withSecurity, SECURITY_PRESETS } from '@/lib/security-middleware';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function handler(request: NextRequest) {
  try {
    const { transcript, videoTitle, videoDescription, channelName, tags } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Take first ~30 seconds or 500 words of transcript for quick preview
    let previewText = '';
    let wordCount = 0;
    const maxWords = 500;
    const maxTime = 30; // seconds

    for (const segment of transcript as TranscriptSegment[]) {
      if (segment.start > maxTime) break;
      
      const words = segment.text.split(' ');
      if (wordCount + words.length > maxWords) {
        const remainingWords = maxWords - wordCount;
        previewText += ' ' + words.slice(0, remainingWords).join(' ');
        break;
      }
      
      previewText += ' ' + segment.text;
      wordCount += words.length;
    }

    if (!previewText.trim()) {
      return NextResponse.json({ 
        preview: 'Processing video content...' 
      });
    }

    const prompt = `Video Metadata:
${videoTitle ? `Title: ${videoTitle}` : ''}
${channelName ? `Channel: ${channelName}` : ''}
${tags && tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}
${videoDescription ? `Description: ${videoDescription}` : ''}

Based on the provided video metadata and transcript excerpt, write a clear, concise, and engaging overview for a potential viewer. Your overview should:

1.  Introduce each speaker's background and what makes them noteworthy.
2.  Introduce the central topic of discussion.
3.  Summarize the primary viewpoint or argument they are presenting.

Transcript:
${previewText}

Write the overview in 3-4 sentences:`;

    let preview: string | undefined;

    try {
      // Try the faster Flash Lite model first
      const modelLite = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const result = await modelLite.generateContent(prompt);
      preview = result.response.text().trim();

      if (!preview) {
        throw new Error('Empty response from AI');
      }

      console.log('Preview generated using gemini-2.5-flash-lite');
    } catch (aiError: any) {
      console.error('Flash Lite model error:', aiError);

      // Check if it's a 503 overloaded error
      const is503Error = aiError?.status === 503 ||
                         aiError?.message?.includes('503') ||
                         aiError?.message?.includes('overloaded');

      if (is503Error) {
        console.log('Flash Lite model overloaded, falling back to gemini-2.5-flash');

        try {
          // Fallback to the more reliable Flash model
          const modelFlash = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await modelFlash.generateContent(prompt);
          preview = result.response.text().trim();

          if (!preview) {
            throw new Error('Empty response from fallback model');
          }

          console.log('Preview generated using gemini-2.5-flash (fallback)');
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
        }
      }
    }

    if (preview) {
      return NextResponse.json({ preview });
    }

    // If both models failed, use the metadata-based fallback
    let fallbackPreview = '';

    if (videoTitle && channelName) {
      fallbackPreview = `This video by ${channelName} discusses "${videoTitle}". Full analysis in progress...`;
    } else if (videoTitle) {
      fallbackPreview = `Analyzing "${videoTitle}" to identify key topics and insights...`;
    } else {
      fallbackPreview = 'Generating preview of video content and key discussion points...';
    }

    return NextResponse.json({
      preview: fallbackPreview
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, SECURITY_PRESETS.PUBLIC);