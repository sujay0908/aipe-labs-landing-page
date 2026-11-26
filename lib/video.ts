import "server-only";
import { createHash } from "node:crypto";

const TOKEN_TTL_SECONDS = 4 * 60 * 60;

/**
 * Embed URL for a lesson video.
 * - Default: Bunny Stream with token authentication. Each URL is signed per page view and
 *   expires in 4 hours, so a copied link stops working. Needs BUNNY_LIBRARY_ID and BUNNY_TOKEN_KEY,
 *   and "Embed view token authentication" switched on in the Bunny library's Security settings.
 * - "youtube:<id>": unlisted YouTube fallback. Anyone with the link can watch it (accepted risk).
 * Returns null when the video can't be embedded (missing id or env vars).
 */
export function videoEmbedUrl(videoId: string | undefined, now = Date.now()): string | null {
  if (!videoId) return null;
  if (videoId.startsWith("youtube:")) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId.slice(8))}?rel=0&modestbranding=1`;
  }
  const library = process.env.BUNNY_LIBRARY_ID;
  const key = process.env.BUNNY_TOKEN_KEY;
  if (!library || !key) return null;
  const expires = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const token = createHash("sha256").update(key + videoId + expires).digest("hex");
  const params = new URLSearchParams({ token, expires: String(expires), autoplay: "false", preload: "true", responsive: "true" });
  return `https://iframe.mediadelivery.net/embed/${encodeURIComponent(library)}/${encodeURIComponent(videoId)}?${params}`;
}
