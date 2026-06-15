import type { Locale } from './works';

// Default site config. Mirrors the Storyblok "settings" singleton and is the
// fallback used whenever the CMS is unreachable.
export const site = {
  name: 'Gibbons Studio',
  tagline: "Studio d'animation, de mise en scène et de réalisation.",
  metaDescription:
    "Studio d'animation, de mise en scène et de réalisation. Réalisateur et animateur, Jérémie Balais.",
  email: 'jeremie.balais@gmail.com',
  location: 'Lyon, France',
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/jeremiebalais_animation/' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jeremiebalais/' },
  ],
};

export interface SiteSettings {
  name: string;
  tagline: string;
  metaDescription: string;
  email: string;
  location: string;
  social: { label: string; href: string }[];
}

const STORYBLOK_TOKEN = import.meta.env.STORYBLOK_TOKEN ?? process.env.STORYBLOK_TOKEN;
const STORYBLOK_CDN = 'https://api.storyblok.com/v2/cdn';
const STORYBLOK_VERSION =
  import.meta.env.STORYBLOK_VERSION || process.env.STORYBLOK_VERSION || 'published';

async function fetchSettings(lang: Locale): Promise<SiteSettings> {
  const fallback: SiteSettings = { ...site };
  if (!STORYBLOK_TOKEN) return fallback;
  try {
    const langParam = lang === 'en' ? '&language=en' : '';
    const url = `${STORYBLOK_CDN}/stories/settings?token=${STORYBLOK_TOKEN}&version=${STORYBLOK_VERSION}${langParam}&cv=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) return fallback;
    const c = (await response.json())?.story?.content ?? {};
    const social = [
      c.instagram_url && { label: 'Instagram', href: c.instagram_url },
      c.linkedin_url && { label: 'LinkedIn', href: c.linkedin_url },
    ].filter(Boolean) as SiteSettings['social'];
    return {
      name: c.site_name || fallback.name,
      tagline: c.tagline || fallback.tagline,
      metaDescription: c.meta_description || fallback.metaDescription,
      email: c.email || fallback.email,
      location: c.location || fallback.location,
      social: social.length ? social : fallback.social,
    };
  } catch {
    return fallback;
  }
}

// Site settings, editable in the Storyblok "settings" story. Memoized per language
// so the whole build only fetches once per locale.
const settingsByLang: Record<string, Promise<SiteSettings>> = {};
export function getSettings(lang: Locale = 'fr'): Promise<SiteSettings> {
  return (settingsByLang[lang] ??= fetchSettings(lang));
}

export const nav = [
  { label: 'Works', href: '/' },
  { label: 'Demoreel', href: '/demoreel' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];
