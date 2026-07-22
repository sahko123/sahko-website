// Maps a link's href to a <symbol> id in public/icons.svg.
const SOCIAL_ICON_KEYS: Record<string, string> = {
	'youtube.com': 'icon-youtube',
	'instagram.com': 'icon-instagram',
};

export function socialIconId(href: string): string | null {
	const key = Object.keys(SOCIAL_ICON_KEYS).find((k) => href.includes(k));
	return key ? SOCIAL_ICON_KEYS[key] : null;
}
