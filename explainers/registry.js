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
  },
  {
    slug: 'upi-payment',
    title: 'What happens when you pay with UPI',
    description: 'Follow a ₹250 payment from a QR scan to the soundbox: how your UPI PIN stays secret, how PSPs and the NPCI switch route the request, why the debit happens before the credit, how banks settle through RBI, and what the rules say when a payment fails.',
    chapters: ['Scan the QR', 'Approve with PIN', 'Route via NPCI', 'Debit & credit', 'Confirm', 'Settle & failures'],
    topics: 'UPI · NPCI · PSP · VPA · Settlement · RBI rules',
    steps: 10,
    minutes: 6
  },
  {
    slug: 'sign-in-with-google',
    title: 'What happens when you click "Sign in with Google"',
    description: 'OAuth 2.0 and OpenID Connect, step by step: state, nonce and PKCE, signing in with a passkey, the one-time authorization code, the back-channel token exchange, checking the ID token, and why apps must identify you by sub, not email.',
    chapters: ['Start', 'Sign in at Google', 'Consent & code', 'Code for tokens', 'Verify & log in', 'Afterwards'],
    topics: 'OAuth 2.0 · OpenID Connect · PKCE · JWT · Passkeys',
    steps: 11,
    minutes: 8
  }
];
