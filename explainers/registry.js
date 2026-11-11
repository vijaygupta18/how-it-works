/*
 * The list of explainers shown on the home page.
 * To add one: copy explainers/_template/ to explainers/<slug>/, edit its flow.js,
 * then add an entry here.
 */
window.HIW_EXPLAINERS = [
  {
    slug: 'url-to-page',
    title: 'What happens when you type a URL and press Enter',
    description: 'Follow a single page load through DNS resolution, NAT, the TCP and TLS handshakes, HTTP/2, the backend, and the browser rendering pipeline.',
    tags: ['Networking', 'DNS', 'TLS', 'HTTP', 'Browsers'],
    steps: 24,
    colors: ['#64748b', '#0e7490', '#7c3aed', '#2563eb', '#047857', '#c2410c', '#b91c1c', '#be185d']
  }
];
