// Content layer. Single source: the Storyblok CMS. getWorks()/getWork() read the
// "work" content-type via the Storyblok CDN and map each story.content onto the
// Work interface below. No fallback: a missing token or failing API stops the
// build (explicit error) rather than serving an empty site.

export type WorkCategory = 'Réalisation' | 'Animation' | 'Making of';

// Canonical category order for the filters.
export const CATEGORY_ORDER: WorkCategory[] = ['Réalisation', 'Animation', 'Making of'];

export interface Credit {
  role: string;
  name: string;
}

export interface Work {
  slug: string;
  title: string;
  categories: WorkCategory[];
  year: number;
  thumbnail: string;
  hoverImage: string;
  // Optional Vimeo/YouTube embed, parsed from the CMS `video_url` field. Plays as
  // a muted looped preview on hover and as the player on the detail page.
  video?: { provider: 'vimeo' | 'youtube'; id: string };
  // Optional: uploaded video (mp4) played as a card preview.
  previewVideo?: string;
  client?: string;
  excerpt: string;
  description: string;
  // Description rendered as HTML (Storyblok rich text: bold, links, etc.).
  descriptionHtml?: string;
  credits: Credit[];
  // Optional: image gallery (4-column grid + lightbox carousel).
  gallery?: string[];
  // What to show on card hover. 'auto' = mp4 > embed > second image.
  hover: 'auto' | 'image' | 'video' | 'none';
}

export type Locale = 'fr' | 'en';

const CATEGORY_EN: Record<string, string> = {
  'Réalisation': 'Directing',
  'Animation': 'Animation',
  'Making of': 'Making of',
};

// Displayed category label per language (the value stays FR for filtering).
export function categoryLabel(category: string, lang: Locale = 'fr'): string {
  return lang === 'en' ? CATEGORY_EN[category] || category : category;
}
const STORYBLOK_TOKEN = import.meta.env.STORYBLOK_TOKEN ?? process.env.STORYBLOK_TOKEN;
const STORYBLOK_CDN = 'https://api.storyblok.com/v2/cdn';
// Defaults to 'published' (prod serves only published content). Local dev sets
// STORYBLOK_VERSION=draft (docker-compose) to preview drafts.
const STORYBLOK_VERSION =
  import.meta.env.STORYBLOK_VERSION || process.env.STORYBLOK_VERSION || 'published';
// Cache-buster: the published CDN is cached; a fresh cv guarantees each build
// fetches the latest published content.
const cacheBuster = () => `&cv=${Date.now()}`;

// An image can be a text URL or a Storyblok asset ({ filename }).
const toUrl = (value: any): string =>
  typeof value === 'string' ? value : value?.filename || '';

// Parse a Vimeo/YouTube URL (single CMS field `video_url`) into provider + id.
function parseVideoUrl(url: any): Work['video'] {
  if (typeof url !== 'string' || !url) return undefined;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { provider: 'vimeo', id: vimeo[1] };
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (youtube) return { provider: 'youtube', id: youtube[1] };
  return undefined;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Allow only safe URL schemes in links (no javascript:, data:, etc.).
const safeHref = (url: string): string => {
  if (url.startsWith('/') || url.startsWith('#')) return url;
  try {
    const { protocol } = new URL(url, 'https://x.invalid');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol) ? url : '#';
  } catch {
    return '#';
  }
};

// Minimal render of a Storyblok rich text document to HTML (bold, italic,
// underline, strike, code, links, headings, lists). Also accepts a raw string.
function renderRich(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return `<p>${escapeHtml(node)}</p>`;
  if (Array.isArray(node)) return node.map(renderRich).join('');
  const kids = () => (node.content || []).map(renderRich).join('');
  switch (node.type) {
    case 'doc':
      return kids();
    case 'paragraph':
      return `<p>${kids()}</p>`;
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2));
      return `<h${level}>${kids()}</h${level}>`;
    }
    case 'bullet_list':
      return `<ul>${kids()}</ul>`;
    case 'ordered_list':
      return `<ol>${kids()}</ol>`;
    case 'list_item':
      return `<li>${kids()}</li>`;
    case 'blockquote':
      return `<blockquote>${kids()}</blockquote>`;
    case 'hard_break':
      return '<br />';
    case 'text': {
      let html = escapeHtml(node.text || '');
      for (const mark of node.marks || []) {
        if (mark.type === 'bold') html = `<strong>${html}</strong>`;
        else if (mark.type === 'italic') html = `<em>${html}</em>`;
        else if (mark.type === 'underline') html = `<u>${html}</u>`;
        else if (mark.type === 'strike') html = `<s>${html}</s>`;
        else if (mark.type === 'code') html = `<code>${html}</code>`;
        else if (mark.type === 'link') {
          const href = escapeAttr(safeHref(String(mark.attrs?.href || mark.attrs?.url || '#')));
          const target = mark.attrs?.target
            ? ` target="${escapeAttr(String(mark.attrs.target))}" rel="noopener noreferrer"`
            : '';
          html = `<a href="${href}"${target}>${html}</a>`;
        }

      }
      return html;
    }
    default:
      return kids();
  }
}

function textFromRich(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  return (node.content || []).map(textFromRich).join(' ').replace(/\s+/g, ' ').trim();
}

function mapStoryToWork(story: any): Work {
  const c = story.content ?? {};
  const descIsRich = c.description && typeof c.description === 'object';
  const descriptionText = descIsRich ? textFromRich(c.description) : c.description || '';
  return {
    slug: story.slug,
    title: c.title || story.name,
    categories: Array.isArray(c.category) ? c.category : c.category ? [c.category] : [],
    year: Number(c.year) || 0,
    thumbnail: toUrl(c.thumbnail),
    hoverImage: toUrl(c.hover_image) || toUrl(c.thumbnail),
    video: parseVideoUrl(c.video_url),
    previewVideo: toUrl(c.preview_video) || undefined,
    client: c.client || undefined,
    excerpt: c.excerpt || descriptionText.slice(0, 140),
    description: descriptionText,
    descriptionHtml: c.description ? renderRich(c.description) : '',
    credits: (c.credits || []).map((b: any) => ({ role: b.role, name: b.name })),
    gallery: Array.isArray(c.gallery) ? c.gallery.map(toUrl).filter(Boolean) : [],
    hover: (c.hover || 'auto') as Work['hover'],
  };
}

// Fetches all works from the CMS, sorted by position (order defined in Storyblok).
// No fallback: missing token or failing API => the build stops.
async function fetchAll(lang: Locale): Promise<Work[]> {
  if (!STORYBLOK_TOKEN) {
    throw new Error(
      'STORYBLOK_TOKEN manquant : renseigne-le (.env en local, secret GitHub Actions en prod).'
    );
  }
  const langParam = lang === 'en' ? '&language=en' : '';
  const url = `${STORYBLOK_CDN}/stories?token=${STORYBLOK_TOKEN}&version=${STORYBLOK_VERSION}&content_type=work&per_page=100&sort_by=position:asc${langParam}${cacheBuster()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Storyblok a repondu ${response.status} en chargeant les works.`);
  }
  const data = await response.json();
  const stories = (data.stories ?? []) as any[];
  stories.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return stories.map(mapStoryToWork);
}

// The grid excludes the demoreel (it has its own page).
export async function getWorks(lang: Locale = 'fr'): Promise<Work[]> {
  const all = await fetchAll(lang);
  return all.filter((work) => !work.slug.includes('demoreel'));
}

export async function getWork(slug: string, lang: Locale = 'fr'): Promise<Work | undefined> {
  const all = await fetchAll(lang);
  return all.find((work) => work.slug === slug);
}

export interface AboutContent {
  bodyHtml: string;
  portrait: string;
  portraitAlt: string;
}

// About page content, editable in the Storyblok "about" story (rich text + photo).
export async function getAbout(lang: Locale = 'fr'): Promise<AboutContent> {
  if (!STORYBLOK_TOKEN) {
    throw new Error('STORYBLOK_TOKEN manquant : impossible de charger la page About.');
  }
  const langParam = lang === 'en' ? '&language=en' : '';
  const url = `${STORYBLOK_CDN}/stories/about?token=${STORYBLOK_TOKEN}&version=${STORYBLOK_VERSION}${langParam}${cacheBuster()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Storyblok a repondu ${response.status} en chargeant la page About.`);
  }
  const content = (await response.json())?.story?.content ?? {};
  const filename = toUrl(content.portrait);
  return {
    bodyHtml: renderRich(content.body),
    portrait: filename.startsWith('//') ? `https:${filename}` : filename,
    portraitAlt: content.portrait?.alt || '',
  };
}
