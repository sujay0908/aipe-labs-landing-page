import { videoEmbedUrl } from "@/lib/video";

export function Video({ videoId, title }: { videoId?: string; title: string }) {
  const src = videoEmbedUrl(videoId);
  if (!src) {
    return (
      <div className="video video-missing">
        Video for this lesson isn&apos;t published yet. The notes below cover the same ground.
      </div>
    );
  }
  return (
    <div className="video">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
