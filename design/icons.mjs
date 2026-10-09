// Source SVGs shared by editable Figma layers and design tooling.
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  message:
    '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 3V11.5a8.5 8.5 0 0 1 8.5-8.5h3a8.5 8.5 0 0 1 8.5 8.5Z"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a7 7 0 0 1 14 0v2"/>',
  users:
    '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 15a5 5 0 0 1 4 5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  fork: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 3c-4 3-4 8 0 9v9M19 3v9"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  document: '<path d="M14 2H5v20h14V7zM14 2v5h5M8 12h8M8 16h8"/>',
  leaf: '<path d="M20 3C8 2 2 8 4 15s12 8 16-12ZM4 20 16 8"/>',
  card: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h3"/>',
  shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>',
};
export function svgIcon(name, color = "#14203D", size = 24) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.document}</svg>`;
}
