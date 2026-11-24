/**
 * Where the videos live: a Cloudflare R2 bucket, so they don't load from the site's own server.
 * To move them (for example to a custom domain on the bucket), change MEDIA_BASE only.
 */
export const MEDIA_BASE = 'https://pub-98eacb9c868140728451ae849bec9187.r2.dev';

export const media = (file: string) => `${MEDIA_BASE}/${file}`;
