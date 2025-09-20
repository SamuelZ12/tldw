# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TLDW (Too Long; Didn't Watch) is a Next.js 15 application that transforms long YouTube videos into topic-driven learning experiences using AI-generated "highlight reels" that identify and extract the most valuable insights scattered across entire video transcripts.

## Key Commands

```bash
npm run dev           # Start development server with Turbopack
npm run build         # Build production bundle with Turbopack
npm start            # Start production server
```

## Architecture & Structure

### Core Application Flow
1. User inputs YouTube URL → `components/url-input.tsx`
2. Fetch video info → `app/api/video-info/route.ts` (metadata & thumbnails)
3. Fetch transcript → `app/api/transcript/route.ts` (uses Supadata API)
4. Generate AI highlight reels → `app/api/generate-topics/route.ts` (Google Gemini API)
5. Display highlight cards → `components/topic-card.tsx`
6. Show highlighted transcript → `components/transcript-viewer.tsx`
7. Control video playback → `components/youtube-player.tsx`
8. Interactive AI chat → `components/ai-chat.tsx` (context-aware Q&A)
9. Suggested questions → `app/api/suggested-questions/route.ts` (dynamic Q&A generation)

### API Routes
- `/api/transcript`: Fetches YouTube transcripts via Supadata API
- `/api/generate-topics`: Creates 5 highlight reels using Gemini (supports model selection)
- `/api/video-info`: Retrieves video metadata (title, author, duration, thumbnail)
- `/api/chat`: Powers context-aware AI chat with citation extraction
- `/api/suggested-questions`: Generates relevant questions based on video content
- `/api/quick-preview`: Fast topic preview generation
- `/api/generate-summary`: Creates comprehensive video summary using Gemini
- `/api/check-limit`: Validates rate limits for authenticated/anonymous users
- `/api/check-video-cache`: Checks if video analysis already exists
- `/api/video-analysis`: Fetches/stores analyzed video data in Supabase
- `/api/update-video-analysis`: Updates existing video analysis
- `/api/toggle-favorite`: Manages user video favorites
- `/api/link-video`: Links video analysis to authenticated user account

### Key Technical Implementation

#### Quote Matching System (`lib/quote-matcher.ts`)
- **Boyer-Moore Search**: Implements efficient substring search algorithm for exact matching
- **N-gram Similarity**: Calculates similarity using 3-gram Jaccard coefficient
- **Transcript Indexing**: Builds comprehensive indices with word positions and n-gram maps
- **Multi-strategy Matching**: Falls back from exact → normalized → fuzzy matching
- **Segment Mapping**: Maps text matches back to precise segment boundaries with character offsets

#### Authentication & Account System
- **Supabase Auth**: User authentication with email/password and OAuth providers
- **Rate Limiting**: Different limits for anonymous (3 videos/30 min) vs authenticated users
- **Video Linking**: Post-authentication linking of anonymous analyses to user accounts
- **Favorites System**: Users can favorite and manage their analyzed videos

#### Timestamp Utilities (`lib/timestamp-utils.ts`)
- **Parsing**: Handles MM:SS and HH:MM:SS formats with validation
- **Extraction**: Finds all timestamps in text with context-aware regex
- **Formatting**: Converts seconds to human-readable timestamp format

### Component Architecture
- **State Management**: React hooks in `app/page.tsx` orchestrate the entire flow
- **Loading States**: Multi-stage loading indicators with progress tracking
- **YouTube Player**: Custom wrapper supporting auto-play of highlight segments
- **Transcript Viewer**: Synchronized highlighting with video playback
- **AI Chat**: Maintains conversation history with citation highlighting
- **Video Progress Bar**: Visual timeline showing highlight segments
- **Auth Modal**: User authentication/registration flow
- **User Menu**: Account management dropdown
- **Loading Context**: Global loading state management

### TypeScript Types (`lib/types.ts`)
- `TranscriptSegment`: Individual transcript segment with timing
- `Topic`: Highlight reel with segments, quotes, and keywords
- `VideoInfo`: Video metadata (title, author, thumbnail, duration)
- `Citation`: Timestamped reference with context
- `ChatMessage`: Chat history with role and citations

### Utility Functions (`lib/utils.ts`)
- `extractVideoId()`: Parses YouTube URLs to extract video ID
- `formatDuration()`: Converts seconds to MM:SS format
- `formatTopicDuration()`: Human-readable duration (e.g., "5 min", "1h 30m")
- `getTopicColor()`: Assigns consistent colors to highlight reels
- `getTopicHSLColor()`: Returns HSL color values for dynamic theming
- `cn()`: Tailwind CSS class merging utility

### Database Integration
- **Supabase Client**: Browser and server clients for data operations
- **Tables**: video_analyses, user_favorites, rate_limit_logs
- **Caching**: Analyzed videos cached to reduce API calls
- **User Data**: Persistent storage of user-specific analysis history

### Environment Variables
Required in `.env.local`:
- `GEMINI_API_KEY`: Google Gemini API key for AI generation
- `SUPADATA_API_KEY`: Supadata API key for transcript fetching
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Deployment
Optimized for Vercel deployment with Next.js 15 and Turbopack for fast builds and hot module replacement.