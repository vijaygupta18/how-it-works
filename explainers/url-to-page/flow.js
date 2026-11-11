/*
 * What happens when you type a URL and press Enter?
 * Addresses are illustrative (RFC 5737 documentation ranges), not real.
 */
HowItWorks.mount({
  title: 'What happens when you type a URL and press Enter',
  subtitle: 'DNS → TCP → TLS → HTTP → backend → rendering, one packet at a time',

  phases: {
    input:   { label: 'Browser',  color: '#64748b' },
    net:     { label: 'Network',  color: '#0e7490' },
    dns:     { label: 'DNS',      color: '#7c3aed' },
    tcp:     { label: 'TCP',      color: '#2563eb' },
    tls:     { label: 'TLS',      color: '#047857' },
    http:    { label: 'HTTP',     color: '#c2410c' },
    backend: { label: 'Backend',  color: '#b91c1c' },
    render:  { label: 'Rendering', color: '#be185d' }
  },

  // at.wide = [x, y] in a 1000×560 stage; at.tall = [x, y] in a 400×420 stage (phones).
  actors: {
    browser:  { label: 'Browser',      sub: 'Chrome, Safari…', icon: 'browser', at: { wide: [110, 190], tall: [70, 40] } },
    os:       { label: 'OS',           sub: 'stub resolver',    icon: 'os',      at: { wide: [110, 430], tall: [200, 40] } },
    router:   { label: 'Home router',  sub: 'gateway · NAT',             icon: 'router',  at: { wide: [330, 320], tall: [70, 120] } },
    resolver: { label: 'DNS resolver', sub: 'ISP / 1.1.1.1',             icon: 'globe',   at: { wide: [560, 170], tall: [200, 205] } },
    root:     { label: 'Root server',  sub: 'the "." zone',              icon: 'server',  at: { wide: [860, 60],  tall: [330, 120] } },
    tld:      { label: 'TLD server',   sub: '.com zone',                 icon: 'server',  at: { wide: [860, 170], tall: [330, 205] } },
    auth:     { label: 'Auth NS',      sub: 'example.com zone',          icon: 'server',  at: { wide: [860, 280], tall: [330, 290] } },
    cdn:      { label: 'CDN / LB',     sub: 'edge server',     icon: 'lb',      at: { wide: [540, 480], tall: [70, 370] } },
    app:      { label: 'App server',   sub: 'backend code',         icon: 'server',  at: { wide: [720, 480], tall: [200, 370] } },
    db:       { label: 'Database',     sub: 'PostgreSQL',                icon: 'db',      at: { wide: [900, 480], tall: [330, 370] } }
  },

  links: [
    ['browser', 'os'], ['browser', 'router'], ['os', 'router'],
    ['router', 'resolver'], ['resolver', 'root'], ['resolver', 'tld'], ['resolver', 'auth'],
    ['router', 'cdn'], ['cdn', 'app'], ['app', 'db']
  ],

  steps: [
    // ---------------- Browser ----------------
    {
      phase: 'input',
      title: 'You type a URL and press Enter',
      work: ['browser'],
      notes: { browser: 'parse URL' },
      text: `
        <p>The address bar first decides: <b>is this a URL or a search?</b> <code>example.com/hello</code> looks like a host, so it's treated as a URL.</p>
        <p>The browser fills in what you skipped (the scheme <code>https://</code>) and splits the URL into parts. Each part decides something later: the <b>host</b> tells us who to look up in DNS, the <b>port</b> where to connect, the <b>path</b> what to ask for.</p>
        <p class="aside">Use <b>Next</b>, the arrow keys, or swipe to move through the steps. Or press <b>Auto-play</b> to watch the whole thing.</p>`,
      inspectTitle: 'Parsed URL',
      inspect: `
        https://example.com:443/hello?ref=home#top
        ───────────────────────────────────────────
        scheme    https
        host      example.com
        port      443        (implied by https)
        path      /hello
        query     ref=home
        fragment  #top       (never sent to the server)`
    },
    {
      phase: 'input',
      title: 'Check HSTS and the local caches',
      work: ['browser'],
      notes: { browser: 'cache miss' },
      text: `
        <p>Before touching the network, the browser checks what it already knows:</p>
        <ul>
          <li><b>HSTS list</b> – if the site has said "always use HTTPS" (or is on the preload list), an <code>http://</code> URL is upgraded to <code>https://</code> right here, without ever sending an insecure request.</li>
          <li><b>Service worker</b> – a site's own JavaScript can intercept the request and answer it offline.</li>
          <li><b>HTTP cache</b> – if a fresh copy of the page is stored, it's used and we're done.</li>
        </ul>
        <p>Nothing usable here, so we have to go to the network. First problem: we have a name, but networks route by <b>IP address</b>.</p>`
    },

    // ---------------- DNS (local) ----------------
    {
      phase: 'dns',
      title: 'Ask the operating system',
      proto: 'getaddrinfo()',
      packets: [{ path: ['browser', 'os'], label: 'example.com → IP?' }],
      notes: { os: 'cache miss' },
      text: `
        <p>The browser checks its own DNS cache, then asks the operating system. The OS's <b>stub resolver</b> checks the <code>hosts</code> file and the OS DNS cache.</p>
        <p>Nobody on this machine knows the address, so the OS will ask the <b>recursive resolver</b> it was configured with (usually handed out by your router through DHCP, or set manually, like <code>1.1.1.1</code>).</p>`,
      inspectTitle: 'Lookup order',
      inspect: `
        1. Browser DNS cache          chrome://net-internals/#dns
        2. OS cache / hosts file      /etc/hosts
        3. Recursive resolver         from DHCP or settings`
    },

    // ---------------- Network ----------------
    {
      phase: 'net',
      title: 'Find the way out: ARP for the gateway',
      proto: 'ARP · Layer 2',
      packets: [
        { path: ['os', 'router'], label: 'who has 192.168.1.1?' },
        { path: ['router', 'os'], label: 'at aa:bb:cc:dd:ee:01' }
      ],
      text: `
        <p>The resolver isn't on your local network, so every packet must go through the <b>default gateway</b>: your router.</p>
        <p>On Wi-Fi or Ethernet, frames are delivered by <b>MAC address</b>, not IP. The OS broadcasts an <b>ARP</b> request ("who has 192.168.1.1?") and the router answers with its MAC. The answer is cached, so this rarely happens.</p>`,
      inspectTitle: 'ARP exchange',
      inspect: `
        Ethernet  dst ff:ff:ff:ff:ff:ff (broadcast)
        ARP       who-has 192.168.1.1 tell 192.168.1.23

        Ethernet  dst 3c:22:fb:10:0a:5e (you)
        ARP       192.168.1.1 is-at aa:bb:cc:dd:ee:01`
    },

    // ---------------- DNS (recursive) ----------------
    {
      phase: 'dns',
      title: 'Send the DNS query to the resolver',
      proto: 'UDP :53',
      packets: [{ path: ['os', 'router', 'resolver'], label: 'A? example.com' }],
      notes: { router: 'NAT' },
      text: `
        <p>The OS sends a small <b>UDP</b> datagram to port 53 of the resolver asking for the <b>A record</b> (IPv4) of <code>example.com</code>. In parallel it usually asks for the <b>AAAA</b> record (IPv6) too.</p>
        <p>On the way out, the router does <b>NAT</b>: it swaps your private address <code>192.168.1.23</code> for its public one and remembers the mapping, so the reply can find its way back to you.</p>
        <p class="aside">Many browsers can use DNS over HTTPS (DoH) instead, which encrypts this query inside a normal HTTPS connection.</p>`,
      inspectTitle: 'DNS query (+ NAT rewrite)',
      inspect: `
        ;; QUESTION SECTION
        ;example.com.        IN  A

        before NAT  src 192.168.1.23:51034  dst 1.1.1.1:53
        after  NAT  src 203.0.113.7:61001   dst 1.1.1.1:53`
    },
    {
      phase: 'dns',
      title: 'Resolver asks a root server',
      proto: 'UDP :53',
      packets: [
        { path: ['resolver', 'root'], label: 'A? example.com' },
        { path: ['root', 'resolver'], label: 'referral: .com servers' }
      ],
      notes: { resolver: 'cache miss' },
      work: ['resolver'],
      text: `
        <p>If the resolver has nothing cached, it starts at the top of the DNS tree: a <b>root server</b>. There are 13 root server names (a.root-servers.net … m.root-servers.net), served by over a thousand machines worldwide via anycast.</p>
        <p>The root doesn't know <code>example.com</code>. It answers with a <b>referral</b>: "I don't know, but here are the servers for <code>.com</code>."</p>
        <p class="aside">In practice, busy resolvers keep root and .com referrals cached for days, so these first hops are usually skipped.</p>`
    },
    {
      phase: 'dns',
      title: 'Resolver asks the .com TLD server',
      proto: 'UDP :53',
      packets: [
        { path: ['resolver', 'tld'], label: 'A? example.com' },
        { path: ['tld', 'resolver'], label: 'referral: ns1.example.com' }
      ],
      text: `
        <p>The <b>top-level domain</b> server for <code>.com</code> also doesn't hold the final answer. It knows which <b>name servers</b> are authoritative for <code>example.com</code> (whatever the domain owner set at their registrar) and refers the resolver to them.</p>`,
      inspectTitle: 'Referral (authority section)',
      inspect: `
        ;; AUTHORITY SECTION
        example.com.   172800  IN  NS  ns1.example.com.
        example.com.   172800  IN  NS  ns2.example.com.

        ;; ADDITIONAL SECTION (glue)
        ns1.example.com. 172800 IN  A   198.51.100.53`
    },
    {
      phase: 'dns',
      title: 'The authoritative server answers',
      proto: 'UDP :53',
      packets: [
        { path: ['resolver', 'auth'], label: 'A? example.com' },
        { path: ['auth', 'resolver'], label: 'A 198.51.100.20' }
      ],
      notes: { auth: 'source of truth' },
      text: `
        <p>The <b>authoritative name server</b> holds the actual records for <code>example.com</code>. It replies with the IP address and a <b>TTL</b> (time to live): how many seconds everyone may cache this answer.</p>
        <p>With DNSSEC, the answer also carries signatures the resolver can verify back up the chain to the root.</p>`,
      inspectTitle: 'Answer',
      inspect: `
        ;; ANSWER SECTION
        example.com.   300   IN   A   198.51.100.20
                       ^^^
                       TTL: cache for 5 minutes`
    },
    {
      phase: 'dns',
      title: 'The IP address comes back to the browser',
      proto: 'UDP :53',
      packets: [{ path: ['resolver', 'router', 'os', 'browser'], label: '198.51.100.20' }],
      notes: { resolver: 'cached 300s', browser: 'cached' },
      text: `
        <p>The answer travels back. The router reverses its NAT mapping, the OS caches it, the browser caches it. The next visit within the TTL skips this whole DNS phase.</p>
        <p>Now the browser knows <b>where</b> to go: <code>198.51.100.20</code>. Next it needs a reliable connection to it.</p>
        <p class="aside">If both IPv4 and IPv6 addresses came back, browsers race them ("Happy Eyeballs") and use whichever connects first.</p>`
    },

    // ---------------- TCP ----------------
    {
      phase: 'tcp',
      title: 'TCP handshake, part 1: SYN',
      proto: 'TCP :443',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'SYN seq=1000' }],
      text: `
        <p>IP packets can be lost, duplicated or arrive out of order. <b>TCP</b> builds a reliable, ordered byte stream on top, but both sides must agree on starting <b>sequence numbers</b> first.</p>
        <p>The browser sends a <b>SYN</b> (synchronize) with a random initial sequence number to port 443. The IP usually belongs to a <b>CDN or load balancer</b> close to you, not the app server itself.</p>`,
      inspectTitle: 'TCP segment',
      inspect: `
        src 203.0.113.7:61544 → dst 198.51.100.20:443
        flags  [SYN]
        seq    1000
        win    65535   mss 1460   sack_ok   wscale 7`
    },
    {
      phase: 'tcp',
      title: 'TCP handshake, part 2: SYN-ACK',
      proto: 'TCP :443',
      packets: [{ path: ['cdn', 'router', 'browser'], label: 'SYN-ACK seq=5000 ack=1001' }],
      text: `
        <p>The server answers with <b>SYN-ACK</b>: it acknowledges the browser's number (<code>ack = 1001</code>) and sends its own starting sequence number.</p>
        <p>If nothing listened on port 443, it would answer with <b>RST</b> (connection refused). If a firewall silently dropped the SYN, the browser would retry and eventually time out.</p>`
    },
    {
      phase: 'tcp',
      title: 'TCP handshake, part 3: ACK',
      proto: 'TCP :443',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'ACK ack=5001' }],
      notes: { browser: 'ESTABLISHED', cdn: 'ESTABLISHED' },
      text: `
        <p>The browser acknowledges the server's number. Both sides are now <b>ESTABLISHED</b>.</p>
        <p>Cost so far: one full <b>round trip</b> (RTT) just to open the connection. That's why connections get reused, and why HTTP/3 replaces TCP with <b>QUIC</b> (over UDP), which merges the transport and encryption handshakes.</p>`
    },

    // ---------------- TLS ----------------
    {
      phase: 'tls',
      title: 'TLS: ClientHello',
      proto: 'TLS 1.3',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'ClientHello' }],
      text: `
        <p>The connection is reliable but anyone along the path (Wi-Fi, ISP, routers) could read it. <b>TLS</b> adds encryption and proves the server's identity.</p>
        <p>The <b>ClientHello</b> lists the TLS versions and ciphers the browser supports, and already includes its half of a <b>key exchange</b> (a key share), guessing the server will accept it. That guess is what lets TLS 1.3 finish in one round trip.</p>`,
      inspectTitle: 'ClientHello (abridged)',
      inspect: `
        supported_versions   TLS 1.3, TLS 1.2
        cipher_suites        TLS_AES_128_GCM_SHA256
                             TLS_CHACHA20_POLY1305_SHA256 …
        key_share            x25519: 3f9a…c21e
        server_name (SNI)    example.com
        alpn                 h2, http/1.1`
    },
    {
      phase: 'tls',
      title: 'TLS: ServerHello, certificate, Finished',
      proto: 'TLS 1.3',
      packets: [
        { path: ['cdn', 'router', 'browser'], label: 'ServerHello + key share' },
        { path: ['cdn', 'router', 'browser'], label: '🔒 Certificate · Finished', parallel: true, delay: 380 }
      ],
      work: ['cdn'],
      text: `
        <p>The server picks a cipher and sends its own <b>key share</b>. Both sides now combine the two shares (ECDHE) and derive the same secret keys, without the secret ever crossing the network.</p>
        <p>Everything after the ServerHello is <b>already encrypted</b>: the server's <b>certificate</b>, a signature proving it holds the certificate's private key (CertificateVerify), and <b>Finished</b>, a checksum of the whole handshake so far.</p>`,
      inspectTitle: 'Server flight',
      inspect: `
        ServerHello          cipher TLS_AES_128_GCM_SHA256
                             key_share x25519: 8b02…4d7f
        ── encrypted from here ──
        EncryptedExtensions  alpn: h2
        Certificate          CN=example.com  (+ intermediate)
        CertificateVerify    signature over handshake
        Finished             HMAC of transcript`
    },
    {
      phase: 'tls',
      title: 'Browser verifies the certificate',
      proto: 'X.509',
      work: ['browser'],
      notes: { browser: 'chain OK ✓' },
      text: `
        <p>Encryption is useless if you're talking to an impostor. The browser checks that:</p>
        <ul>
          <li>the certificate is for <code>example.com</code> and hasn't expired;</li>
          <li>it chains, via an intermediate, up to a <b>root CA</b> already in the device's trust store;</li>
          <li>the CertificateVerify signature matches the certificate's public key;</li>
          <li>it isn't revoked, and was published in public <b>Certificate Transparency</b> logs.</li>
        </ul>
        <p>Any failure shows the full-page "Your connection is not private" warning.</p>`,
      inspectTitle: 'Chain of trust',
      inspect: `
        example.com                      (leaf, sent by server)
          └─ signed by  R11              (intermediate, sent by server)
               └─ signed by  ISRG Root X1  (root, already on your device)`
    },
    {
      phase: 'tls',
      title: 'TLS: client Finished, the tunnel is up',
      proto: 'TLS 1.3',
      packets: [{ path: ['browser', 'router', 'cdn'], label: '🔒 Finished' }],
      notes: { browser: '🔒 secure', cdn: '🔒 secure' },
      text: `
        <p>The browser sends its own <b>Finished</b>. The handshake is complete: from now on every byte in both directions is encrypted and integrity-protected.</p>
        <p>Observers on the network can still see <b>which IP</b> you connected to and (unless Encrypted Client Hello is used) the <b>hostname</b> from SNI, but not the path, headers, cookies or content.</p>
        <p class="aside">On a repeat visit, a saved session ticket can resume TLS and even send data in the very first flight ("0-RTT").</p>`
    },

    // ---------------- HTTP ----------------
    {
      phase: 'http',
      title: 'Send the HTTP request',
      proto: 'HTTP/2',
      packets: [{ path: ['browser', 'router', 'cdn'], label: '🔒 GET /hello' }],
      text: `
        <p>Finally, the actual request. ALPN picked <b>HTTP/2</b>, so the request is sent as compressed binary frames on a <b>stream</b> inside the connection; many requests can share it at once.</p>
        <p>Headers tell the server who's asking and what's acceptable: languages, compression, cached versions, and any <b>cookies</b> previously set for this site (that's how you stay logged in).</p>`,
      inspectTitle: 'Request (stream 1)',
      inspect: `
        :method      GET
        :scheme      https
        :authority   example.com
        :path        /hello?ref=home
        user-agent   Mozilla/5.0 (…) Chrome/…
        accept       text/html,application/xhtml+xml,…
        accept-encoding  gzip, br, zstd
        accept-language  en-US,en;q=0.9
        cookie       session=8f2c…`
    },

    // ---------------- Backend ----------------
    {
      phase: 'backend',
      title: 'The edge forwards to the origin',
      proto: 'HTTP · internal',
      packets: [{ path: ['cdn', 'app'], label: 'GET /hello + X-Forwarded-For' }],
      notes: { cdn: 'cache miss' },
      work: ['cdn'],
      text: `
        <p>The CDN / load balancer <b>terminated TLS</b>: it decrypted the request. It now:</p>
        <ul>
          <li>checks its own cache (a hit would return immediately, from a city near you);</li>
          <li>applies rules: rate limits, WAF, redirects;</li>
          <li>picks a <b>healthy app server</b> (round-robin, least-connections…) and forwards the request over a pre-opened connection.</li>
        </ul>
        <p>It adds headers like <code>X-Forwarded-For</code> so the app still knows your real IP.</p>`
    },
    {
      phase: 'backend',
      title: 'The app runs your code and queries the database',
      proto: 'SQL · :5432',
      packets: [
        { path: ['app', 'db'], label: 'SELECT … WHERE slug=$1' },
        { path: ['db', 'app'], label: '1 row' }
      ],
      work: ['app'],
      text: `
        <p>The web framework <b>routes</b> <code>/hello</code> to a handler, checks the session cookie, then fetches what it needs: from a <b>database</b>, a cache like Redis, or other internal services.</p>
        <p>This is typically the slowest part of the server's time. Fast handlers do as few round trips to the database as possible.</p>`,
      inspectTitle: 'Query',
      inspect: `
        SELECT title, body, updated_at
        FROM   pages
        WHERE  slug = $1          -- 'hello'
        LIMIT  1;
        -- 1 row (2.1 ms)`
    },
    {
      phase: 'backend',
      title: 'The app builds the response',
      proto: 'HTTP 200',
      packets: [{ path: ['app', 'cdn'], label: '200 OK · text/html' }],
      notes: { cdn: 'may cache' },
      text: `
        <p>The handler renders an HTML page (from a template, or a server-rendered React/Vue/… app) and returns it with a <b>status code</b> and headers.</p>
        <p><code>Cache-Control</code> tells the CDN and the browser whether and how long they may reuse this response, which decides whether the next visitor even reaches the app server.</p>`
    },

    // ---------------- HTTP response ----------------
    {
      phase: 'http',
      title: 'The response streams back to the browser',
      proto: 'HTTP/2',
      packets: [{ path: ['cdn', 'router', 'browser'], label: '🔒 200 OK + HTML' }],
      text: `
        <p>The edge compresses the HTML (Brotli or gzip), encrypts it with the TLS session keys, and sends it back as HTTP/2 DATA frames. TCP splits it into segments and acknowledges them as they arrive.</p>
        <p>The browser doesn't wait for the whole file: it starts <b>parsing as bytes arrive</b>.</p>`,
      inspectTitle: 'Response headers',
      inspect: `
        :status            200
        content-type       text/html; charset=utf-8
        content-encoding   br
        cache-control      public, max-age=60
        set-cookie         session=8f2c…; Secure; HttpOnly; SameSite=Lax
        strict-transport-security  max-age=31536000
        server-timing      db;dur=2.1, app;dur=14`
    },

    // ---------------- Rendering ----------------
    {
      phase: 'render',
      title: 'Parse HTML and fetch sub-resources',
      proto: 'HTTP/2 · multiplexed',
      packets: [
        { path: ['browser', 'router', 'cdn'], label: 'GET /app.css' },
        { path: ['browser', 'router', 'cdn'], label: 'GET /app.js', parallel: true },
        { path: ['browser', 'router', 'cdn'], label: 'GET /hero.webp', parallel: true }
      ],
      work: ['browser'],
      text: `
        <p>The HTML parser builds the <b>DOM</b> tree. A preload scanner runs ahead, spotting <code>&lt;link&gt;</code>, <code>&lt;script&gt;</code> and <code>&lt;img&gt;</code> tags and requesting them immediately.</p>
        <p>All these requests reuse the <b>same</b> connection as parallel HTTP/2 streams. No new DNS lookup, TCP or TLS handshake needed.</p>
        <p>CSS is <b>render-blocking</b>, and classic <code>&lt;script&gt;</code> tags pause parsing until they've downloaded and run (unless marked <code>defer</code>/<code>async</code>).</p>`
    },
    {
      phase: 'render',
      title: 'Style, layout, paint, composite',
      work: ['browser'],
      notes: { browser: 'first paint' },
      text: `
        <p>With the DOM and the CSS rules (CSSOM), the rendering engine:</p>
        <ul>
          <li><b>Style</b> – computes the final CSS for every element;</li>
          <li><b>Layout</b> – calculates each box's position and size;</li>
          <li><b>Paint</b> – records drawing commands for text, colors, images, borders;</li>
          <li><b>Composite</b> – the GPU combines layers into the pixels on your screen.</li>
        </ul>
        <p>JavaScript then runs, attaches event handlers and may change the DOM, triggering parts of this pipeline again.</p>`,
      inspectTitle: 'Pipeline',
      inspect: `
        HTML ─► DOM ─┐
                      ├─► Render tree ─► Layout ─► Paint ─► Composite ─► 🖥
        CSS  ─► CSSOM ┘
        JS   ─► can modify DOM/CSSOM at any time`
    },
    {
      phase: 'render',
      title: 'Page loaded, and what stays behind',
      actors: ['browser', 'os', 'resolver', 'cdn'],
      notes: { browser: 'HTTP cache · cookies', os: 'DNS cache', resolver: 'DNS cache', cdn: 'cached page' },
      text: `
        <p>The page is on screen. Roughly: <b>~1 RTT</b> for DNS (often 0 thanks to caches), <b>1 RTT</b> for TCP, <b>1 RTT</b> for TLS, <b>1 RTT</b> + server time for the HTML, then more for sub-resources.</p>
        <p>A lot is kept to make the next visit faster: DNS answers until their TTL, the open connection (kept alive for more requests), a TLS session ticket, cached files, and cookies.</p>
        <p class="aside">Press <b>Restart</b> to watch it again, or go back to the gallery for other explainers.</p>`
    }
  ]
});
