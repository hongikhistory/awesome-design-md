// Original line icons for slides (24×24, 2px stroke). Drawn for 널리잇다; not taken from an icon set.
export type IconName = "target" | "clock" | "bulb" | "pencil" | "check" | "star";

const P: Record<IconName, string> = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M15.5 8.5 21 3M18 3h3v3"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path d="M12 7v3M10.5 8.5h3"/>',
  pencil: '<path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14 6.6l3.4 3.4M4 20h7"/>',
  check: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 12.4l2.7 2.7L16.4 9"/>',
  star: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/><path d="M19 2.5v2M18 3.5h2"/>',
};

export const iconSvg = (name: IconName, color: string, bg: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="24" fill="#${bg}"/><g transform="translate(12 12)" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="#${color}">${P[name]}</g></svg>`;

/** PNG data URL (browser only) so every PowerPoint version shows the icon. */
export async function iconPng(name: IconName, color: string, bg: string, px = 192): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(name, color, bg))}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = px;
  c.getContext("2d")!.drawImage(img, 0, 0, px, px);
  return c.toDataURL("image/png");
}
