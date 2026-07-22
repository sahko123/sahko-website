export const SITE_TITLE = 'Sahko';
export const SITE_DESCRIPTION = "Sahko's channel — videos, posts, and links.";

export const NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/blog/', label: 'Blog' },
];

// `icon` is a Simple Icons slug and `color` its hex (no #). Icons are fetched
// per-visit from cdn.simpleicons.org rather than self-hosted — GitHub's brand
// black would vanish on the dark footer, so it's overridden to white.
export const SOCIAL_LINKS = [
	{ href: 'https://www.youtube.com/@Sahko123', label: 'YouTube', icon: 'youtube', color: 'ff0000' },
	{ href: 'https://www.instagram.com/sahko123/', label: 'Instagram', icon: 'instagram', color: 'e4405f' },
	{ href: 'https://github.com/sahko123', label: 'GitHub', icon: 'github', color: 'ffffff' },
];

// YouTube handle (without the @) used to look up the latest video at build time.
export const YOUTUBE_HANDLE = 'Sahko123';
