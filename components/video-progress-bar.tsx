"use client";

import { useEffect, useState, useRef } from "react";
import { Topic, TranscriptSegment } from "@/lib/types";
import { formatDuration, getTopicHSLColor } from "@/lib/utils";
import { TopicCard } from "@/components/topic-card";
import { PlayCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VideoProgressBarProps {
  videoDuration: number;
  currentTime: number;
  topics: Topic[];
  selectedTopic: Topic | null;
  onSeek: (time: number) => void;
  onTopicSelect?: (topic: Topic, fromPlayAll?: boolean) => void;
  onPlayTopic?: (topic: Topic) => void;
  transcript?: TranscriptSegment[];
  onPlayAllTopics?: () => void;
  isPlayingAll?: boolean;
  playAllIndex?: number;
}

export function VideoProgressBar({
  videoDuration,
  currentTime,
  topics,
  selectedTopic,
  onSeek,
  onTopicSelect,
  onPlayTopic,
  transcript,
  onPlayAllTopics,
  isPlayingAll = false,
  playAllIndex = 0,
}: VideoProgressBarProps) {
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Clicking the bar starts Play All mode
    e.stopPropagation();
    onPlayAllTopics?.();
  };

  // Calculate topic density heatmap
  const calculateDensity = () => {
    if (!videoDuration) return [];
    const buckets = 100; // Number of heatmap segments
    const bucketSize = videoDuration / buckets;
    const density = new Array(buckets).fill(0);

    topics.forEach((topic) => {
      topic.segments.forEach((segment) => {
        const startBucket = Math.floor(segment.start / bucketSize);
        const endBucket = Math.min(
          Math.floor(segment.end / bucketSize),
          buckets - 1
        );
        for (let i = startBucket; i <= endBucket; i++) {
          density[i]++;
        }
      });
    });

    const maxDensity = Math.max(...density);
    return density.map((d) => d / maxDensity);
  };

  const density = calculateDensity();

  // Flatten segments for rendering without nested maps
  const allSegments = topics.flatMap((topic, topicIndex) =>
    topic.segments.map((segment, segmentIndex) => ({
      key: `${topic.id}-${segmentIndex}`,
      topic,
      topicIndex,
      segment,
      segmentIndex,
    }))
  );

  return (
    <TooltipProvider>
      <div className="relative w-full space-y-2">
        {/* Main progress bar - Click to Play All */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={progressBarRef}
              className="relative h-12 bg-muted rounded-lg overflow-hidden cursor-pointer group transition-all hover:ring-2 hover:ring-primary/50"
              onClick={handleClick}
              onMouseEnter={() => setIsHoveringBar(true)}
              onMouseLeave={() => setIsHoveringBar(false)}
            >
          {/* Heatmap background */}
          <div className="absolute inset-0 flex">
            {density.map((d, i) => (
              <div
                key={i}
                className="flex-1 h-full transition-opacity"
                style={{
                  backgroundColor: `hsl(var(--primary) / ${d * 0.2})`,
                }}
              />
            ))}
          </div>

          {/* Topic segments */}
          <div className="absolute inset-0">
            {allSegments.map(({ key, topic, topicIndex, segment }) => {
              const startPercentage = (segment.start / videoDuration) * 100;
              const widthPercentage =
                ((segment.end - segment.start) / videoDuration) * 100;
              const isSelected = selectedTopic?.id === topic.id;

              return (
                <div
                  key={key}
                  className={cn(
                    "absolute top-2 h-8 rounded-md transition-all",
                    isSelected && "z-10 ring-2 ring-white"
                  )}
                  style={{
                    left: `${startPercentage}%`,
                    width: `${widthPercentage}%`,
                    backgroundColor: `hsl(${getTopicHSLColor(topicIndex)})`,
                    opacity: isSelected ? 1 : 0.7,
                    pointerEvents: 'none',
                  }}
                />
              );
            })}
          </div>

          {/* Play All icon indicator on hover */}
          {isHoveringBar && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg animate-in fade-in zoom-in duration-200">
                <PlayCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          )}

          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none transition-all"
            style={{
              left: `${(currentTime / videoDuration) * 100}%`,
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex items-center gap-1">
              <PlayCircle className="h-3 w-3" />
              {isPlayingAll ? 'Stop playing highlights' : 'Play all highlights'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Topic insights list */}
        <div className="mt-3">
          <div className="space-y-1">
            {topics.map((topic, index) => {
              const isSelected = selectedTopic?.id === topic.id;
              const isCurrentlyPlaying = isPlayingAll && index === playAllIndex;
            
              return (
                <div key={topic.id} className={cn(
                  "relative",
                  isCurrentlyPlaying && "animate-pulse"
                )}>
                  <TopicCard
                    topic={topic}
                    isSelected={isSelected || isCurrentlyPlaying}
                    onClick={() => onTopicSelect?.(topic)}
                    topicIndex={index}
                    onPlayTopic={() => onPlayTopic?.(topic)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}