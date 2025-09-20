import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranscriptSegment, Topic } from '@/lib/types';
import { withSecurity } from '@/lib/security-middleware';
import { RATE_LIMITS } from '@/lib/rate-limiter';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function formatTranscriptForContext(segments: TranscriptSegment[]): string {
  return segments.map(s => {
    const mins = Math.floor(s.start / 60);
    const secs = Math.floor(s.start % 60);
    const timestamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `[${timestamp}] ${s.text}`;
  }).join('\n');
}

async function handler(request: NextRequest) {
  try {
    const { transcript, topics, videoTitle } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Valid transcript is required' },
        { status: 400 }
      );
    }

    const fullTranscript = formatTranscriptForContext(transcript);
    const topicsContext = topics?.map((t: Topic) => 
      `- ${t.title}: ${t.description}`
    ).join('\n') || 'No topics available';

    
    const prompt = `You are an expert assistant that generates thoughtful QUESTIONS about a video using ONLY its transcript. Every question MUST be answerable from explicit statements in the transcript—no outside knowledge, inference, or speculation.

## Inputs
- Video Title: "${videoTitle || 'Untitled Video'}"
- Highlight Reels Already Covered (avoid these themes): ${topicsContext}
- Full Transcript: ${fullTranscript}

## Grounding Rule (Most Important)
- Use the transcript above as the sole source of truth.
- Do not ask about anything that is not clearly and explicitly stated in the transcript.
- Before keeping a question, verify you can point to the exact sentence(s) that answer it.

## Instructions
Generate EXACTLY 3 questions that:
1) Are fully answerable from the transcript.
2) Do NOT overlap with the highlight-reel themes (avoid synonyms and paraphrases of those themes).
3) Focus on:
   - Specific facts, examples, or data mentioned.
   - Explanations or reasoning the speaker provides.
   - Connections made between ideas explicitly discussed.
   - Concrete advice, steps, or practices actually stated.
   - Context/background that the speaker explicitly explains.
4) Are precise, grounded, and non-hypothetical.
5) Are concise: less than 15 words each.
6) Complement (not duplicate) the highlight-reel insights.
7) Prefer “what/why/how” over yes/no; avoid multi-part or vague questions.
8) Use the transcript's predominant language.

## Validation Checklist (apply to each question)
- Is the answer explicitly in the transcript (with quotable sentence[s])?
- Is it outside the covered highlight-reel themes (including close paraphrases)?
- Is it specific, single-focus, and less than 15 words?

## Output Format
Return ONLY a JSON array of 3 strings (no markdown, no extra text), e.g.:
["Question 1?", "Question 2?", "Question 3?"]`;

    let response = '';

    try {
      // Try with primary model first
      const aiModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      });
      
      const result = await aiModel.generateContent(prompt);
      response = result.response.text();
    } catch (error: any) {
      // Fallback to lighter model on any error

      try {
        // Fallback to lighter model
        const aiModelLite = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash-lite',
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          }
        });

        const result = await aiModelLite.generateContent(prompt);
        response = result.response.text();
      } catch (fallbackError: any) {
        // Fallback error - continue to default questions
      }
    }
    
    if (!response) {
      return NextResponse.json({ 
        questions: [
          "What contrarian or surprising insights challenge conventional thinking?",
          "What specific examples or case studies illustrate the key concepts?",
          "What are the practical implications for someone in my field?"
        ]
      });
    }

    let questions: string[] = [];
    try {
      // First try direct JSON parse
      questions = JSON.parse(response);
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      
      // Try to extract JSON array from the response
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          // Try to extract questions from a numbered list or line-separated format
          const lines = response.split('\n').filter(line => line.trim());
          questions = lines
            .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, '').trim())
            .filter(q => q.length > 0 && q.length < 100)
            .slice(0, 3);
          
          if (questions.length === 0) {
            throw new Error('Could not extract any questions from response');
          }
        }
      } else {
        throw new Error('No JSON array found in response');
      }
    }
    
    // Validate and clean questions
    questions = questions
      .filter(q => typeof q === 'string' && q.trim().length > 0)
      .map(q => q.trim())
      .slice(0, 3);
    
    
    if (questions.length === 0) {
      questions = [
        "What's the most actionable advice I can apply immediately?",
        "Which ideas challenge my current assumptions?",
        "What evidence or data supports the main arguments?"
      ];
    }

    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json(
      { questions: [
        "What's the most actionable advice I can apply immediately?",
        "Which ideas challenge my current assumptions?",
        "What evidence or data supports the main arguments?"
      ] },
      { status: 200 }
    );
  }
}

// Apply security with generation rate limits
export const POST = withSecurity(handler, {
  rateLimit: RATE_LIMITS.AUTH_GENERATION, // Use authenticated rate limit
  maxBodySize: 10 * 1024 * 1024, // 10MB for large transcripts
  allowedMethods: ['POST']
});