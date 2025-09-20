import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VideoGrid } from './video-grid';

export default async function MyVideosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user's video history with video details
  const { data: userVideos, error } = await supabase
    .from('user_videos')
    .select(`
      *,
      video:video_analyses(*)
    `)
    .eq('user_id', user.id)
    .order('accessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching user videos:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Videos</h1>
        <p className="text-muted-foreground">
          Your analyzed videos are saved here. Click on any video to continue where you left off.
        </p>
      </div>

      {userVideos && userVideos.length > 0 ? (
        <VideoGrid videos={userVideos} />
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">
            You haven't analyzed any videos yet.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Analyze Your First Video
          </a>
        </div>
      )}
    </div>
  );
}