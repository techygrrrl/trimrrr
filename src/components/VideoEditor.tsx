import * as Slider from '@radix-ui/react-slider';
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output
} from 'mediabunny';
import React, { useCallback, useRef, useState } from 'react';
import { formatDuration } from '../utils/toDuration';
import { downloadFile } from '../utils/downloadFile';

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(selected));
    }
  }, [videoUrl])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const vidDuration = videoRef.current.duration;
      setDuration(vidDuration);
      setTrimRange([0, vidDuration]);
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  /**
   * Set the bounds of the trim, and adjust the current play time so the user knows
   * where in the video that trim edge is at.
   */
  const handleTrimChange = useCallback((newValues: number[]) => {
    const nextRange = newValues as [number, number];

    if (videoRef.current) {
      if (nextRange[0] !== trimRange[0]) {
        videoRef.current.currentTime = nextRange[0];
      } else if (nextRange[1] !== trimRange[1]) {
        videoRef.current.currentTime = nextRange[1];
      }
    }

    setTrimRange(nextRange);
  }, [trimRange]);

  /**
   * Touching the timeline sets the time in the video relative to the position on the timeline.
   */
  const updateTimeFromPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = percent * duration;
  }, [duration]);

  /**
   * Changes the video time when pressed
   */
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // ignore if the target are any of the the slider thumbs: they're handled by the slider events
    if ((e.target as HTMLElement).getAttribute('role') === 'slider') return;

    e.currentTarget.setPointerCapture(e.pointerId);
    updateTimeFromPointer(e);
  }, [updateTimeFromPointer]);

  /**
   * Changes the video time when moved
   */
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updateTimeFromPointer(e);
    }
  }, [updateTimeFromPointer]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  /**
   * Perform the video trimming and compression
   */
  const processVideo = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });

      const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
      });

      const trimStart = trimRange[0]
      const trimEnd = trimRange[1]
      const conversion = await Conversion.init({
        input,
        output,
        trim: {
          start: trimStart,
          end: trimEnd,
        }
      });

      await conversion.execute();

      const buffer = output.target.buffer!;
      const processedBlob = new Blob([buffer], { type: 'video/mp4' });
      const processedUrl = URL.createObjectURL(processedBlob);

      const timestamp = `${formatDuration(trimStart * 1000)} to ${formatDuration(trimEnd * 1000)}`
      const filename = `${file.name} -- ${timestamp}.mp4`;

      downloadFile({
        linkToFile: processedUrl,
        filename,
      })
    } catch (error) {
      console.error("Video processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [file, trimRange]);

  return (
    <div className="flex flex-col gap-4 py-6 max-w-2xl mx-auto">
      <input
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="btn bg-light-200/40 dark:bg-dark-200/80 text-inherit block w-full text-sm file:mr-8 file:my-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:bg-cmyk-pink file:text-white file:cursor-pointer"
      />

      {videoUrl && (
        <div className="flex flex-col gap-4">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="w-full"
          />

          {duration > 0 && (
            <div className="flex flex-col gap-2">

              {/* The area to be trimmed is in pink */}
              <div
                className="mx-3 relative h-12 bg-cmyk-pink/40 rounded overflow-hidden select-none touch-none cursor-pointer"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* These are the sides to the left of the trim start, and the right of the trim end */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-light-200 dark:bg-dark-200 z-0 pointer-events-none"
                  style={{ width: `${(trimRange[0] / duration) * 100}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 bg-light-200 dark:bg-dark-200 z-0 pointer-events-none"
                  style={{ width: `${(1 - (trimRange[1] / duration)) * 100}%` }}
                />

                {/* The area denoted to be trimmed is in pink */}
                <Slider.Root
                  className="absolute inset-0 flex items-center w-full h-full z-10 pointer-events-none"
                  value={trimRange}
                  max={duration}
                  step={0.01}
                  minStepsBetweenThumbs={0.5}
                  onValueChange={handleTrimChange}
                >
                  <Slider.Track className="relative grow h-full">
                    <Slider.Range className="absolute h-full border-2 border-cmyk-pink" />
                  </Slider.Track>

                  <Slider.Thumb
                    className="block w-2.5 -ml-1 h-10 rounded bg-cmyk-pink cursor-grab active:cursor-grabbing pointer-events-auto focus:outline-none"
                  />
                  <Slider.Thumb
                    className="block w-2.5 -mr-1 h-10 rounded bg-cmyk-pink cursor-grab active:cursor-grabbing pointer-events-auto focus:outline-none"
                  />
                </Slider.Root>

                {/* Current play position (yellow or purple vertical bar in the timeline) */}
                <div
                  id="player-indicator-line"
                  className="absolute top-0 bottom-0 w-0.5 bg-cmyk-purple dark:bg-cmyk-yellow z-20 pointer-events-none shadow"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
              </div>

              {/* Text of trim start and end times */}
              <div className="px-5 flex justify-between font-medium">
                <span>
                  {formatDuration(trimRange[0] * 1000)}
                </span>

                <span>
                  {formatDuration(trimRange[1] * 1000)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className='flex justify-center'>
        <button
          onClick={processVideo}
          disabled={isProcessing}
          className="btn bg-cmyk-pink text-white disabled:bg-dark-300"
        >
          {isProcessing ? 'Processing...' : 'Export & Compress'}
        </button>
      </div>
    </div>
  );
}