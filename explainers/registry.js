/*
 * Explainers listed on the home page, in order.
 * To add one: copy explainers/_template/ to explainers/<slug>/, write its flow.js,
 * then add an entry here.
 */
window.HIW_EXPLAINERS = [
  {
    slug: 'url-to-page',
    title: 'What happens when you type a URL and press Enter',
    description: 'One page load, end to end: URL parsing and caches, recursive DNS resolution, ARP and NAT, the TCP three-way handshake, the TLS 1.3 handshake and certificate checks, HTTP/2 through a CDN to the app and database, and the browser rendering pipeline.',
    chapters: ['URL & cache', 'DNS lookup', 'TCP handshake', 'TLS handshake', 'HTTP & backend', 'Rendering'],
    topics: 'DNS · ARP · NAT · TCP · TLS 1.3 · HTTP/2 · CDN',
    steps: 24,
    minutes: 12
  }
];
