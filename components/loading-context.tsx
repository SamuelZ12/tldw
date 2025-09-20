"use client";

import { VideoInfo } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User } from "lucide-react";

interface LoadingContextProps {
  videoInfo?: VideoInfo | null;
  preview?: string;
}

export function LoadingContext({ videoInfo, preview }: LoadingContextProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Video Info Card */}
      {videoInfo ? (
        <Card className="p-6">
          <div className="flex gap-6">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-48 h-27 object-cover rounded-md"
              />
            </div>

            {/* Video Details */}
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold line-clamp-2">
                {videoInfo.title}
              </h3>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{videoInfo.author}</span>
                </div>
                {videoInfo.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(videoInfo.duration / 60)} min</span>
                  </div>
                )}
              </div>

              {/* Quick Preview */}
              {preview && preview !== 'Processing video content...' && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {preview}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex gap-6">
            <Skeleton className="w-48 h-27 rounded-md" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              {/* Show preview even without video info */}
              {preview && preview !== 'Processing video content...' ? (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {preview}
                  </p>
                </div>
              ) : (
                <Skeleton className="h-16 w-full" />
              )}
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}