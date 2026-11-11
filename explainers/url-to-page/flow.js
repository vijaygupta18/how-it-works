/*
 * What happens when you type a URL and press Enter?
 * Audience: CS students and working engineers. Plain explanation first,
 * protocol-level depth under "Under the hood".
 * IP addresses are illustrative (RFC 5737 / RFC 1918 ranges).
 */
HowItWorks.mount({
  title: 'What happens when you type a URL and press Enter',
  shortTitle: 'Typing a URL',

  chapters: [
    { id: 'read', title: 'URL & cache' },
    { id: 'find', title: 'DNS lookup' },
    { id: 'connect', title: 'TCP handshake' },
    { id: 'secure', title: 'TLS handshake' },
    { id: 'ask', title: 'HTTP & backend' },
    { id: 'draw', title: 'Rendering' }
  ],

  // [x, y, w, h] on a 1000×572 stage (wide) and a 400×420 stage (tall, phones).
  zones: [
    { id: 'home', label: { wide: 'YOUR NETWORK · LAN', tall: 'YOUR NETWORK' }, at: { wide: [16, 70, 300, 470], tall: [6, 6, 388, 124] } },
    { id: 'dns', label: { wide: 'DNS RESOLUTION', tall: 'DNS' }, at: { wide: [380, 16, 604, 318], tall: [6, 138, 388, 152] } },
    { id: 'site', label: { wide: 'EXAMPLE.COM INFRASTRUCTURE', tall: 'EXAMPLE.COM' }, at: { wide: [380, 356, 604, 200], tall: [6, 300, 388, 114] } }
  ],

  actors: {
    browser:  { label: 'Browser', sub: 'Chrome, Safari, Firefox', icon: 'browser',
                at: { wide: [106, 190], tall: [70, 52] } },
    os:       { label: { wide: 'Operating system', tall: 'OS' }, sub: 'stub resolver · TCP/IP stack', icon: 'laptop',
                at: { wide: [106, 420], tall: [330, 52] } },
    router:   { label: 'Router', sub: 'default gateway · NAT', icon: 'router',
                at: { wide: [240, 305], tall: [200, 82] } },
    resolver: { label: 'Recursive resolver', sub: 'ISP DNS, 1.1.1.1, 8.8.8.8', icon: 'book',
                at: { wide: [490, 175], tall: [200, 182] } },
    root:     { label: 'Root server', sub: 'the "." zone', icon: 'tree', labelSide: { wide: 'right' }, bubble: { wide: 'left' },
                at: { wide: [790, 85], tall: [70, 244] } },
    tld:      { label: 'TLD server', sub: '.com zone', icon: 'server', labelSide: { wide: 'right' }, bubble: { wide: 'left' },
                at: { wide: [790, 175], tall: [200, 244] } },
    auth:     { label: 'Authoritative NS', sub: 'example.com zone', icon: 'server', labelSide: { wide: 'right' }, bubble: { wide: 'left' },
                at: { wide: [790, 265], tall: [330, 244] } },
    cdn:      { label: { wide: 'CDN edge / LB', tall: 'CDN edge' }, sub: 'terminates TLS, caches', icon: 'edge',
                at: { wide: [490, 445], tall: [70, 348] } },
    app:      { label: 'App server', sub: 'application code', icon: 'server',
                at: { wide: [690, 445], tall: [200, 348] } },
    db:       { label: 'Database', sub: 'PostgreSQL', icon: 'db',
                at: { wide: [880, 445], tall: [330, 348] } }
  },

  links: [
    ['browser', 'os'], ['browser', 'router'], ['os', 'router'],
    ['router', 'resolver'], ['resolver', 'root'], ['resolver', 'tld'], ['resolver', 'auth'],
    { a: 'router', b: 'cdn', via: { tall: [[120, 131], [12, 131], [12, 348]] } },
    ['cdn', 'app'], ['app', 'db']
  ],

  steps: [
    /* ================= URL & cache ================= */
    {
      chapter: 'read',
      title: 'Parse the URL',
      work: ['browser'],
      say: { browser: 'https://example.com:443/hello' },
      text: `
        <p>You type <code>example.com/hello</code> and press Enter. The browser first decides whether this is a URL or a search query. It looks like a hostname, so it's treated as a URL.</p>
        <p>The browser fills in what you left out, the scheme <code>https://</code>, and splits the URL into its parts. Every later step depends on one of them: the <b>host</b> decides what to look up in DNS, the <b>port</b> where to connect, and the <b>path</b> what to ask the server for.</p>`,
      why: `<p>The fragment (<code>#…</code>) never leaves your machine, and the scheme picks the port and whether TLS is used. Many "it works in the browser but not in my code" bugs come from parsing these parts differently.</p>`,
      tech: `
        <p>Modern browsers follow the <b>WHATWG URL Standard</b> rather than RFC 3986. Parsing also applies:</p>
        <ul>
          <li><b>IDNA / Punycode</b>: a Unicode host like <code>bücher.de</code> becomes <code>xn--bcher-kva.de</code>.</li>
          <li><b>Normalisation</b>: the host is lower-cased, default ports are dropped, <code>..</code> segments are resolved.</li>
          <li><b>Percent-encoding</b> of characters that aren't allowed in the path or query.</li>
        </ul>`,
      inspectTitle: 'Parsed URL',
      inspect: `
        https://example.com/hello?ref=home#top
        ──────────────────────────────────────
        scheme    https
        host      example.com
        port      443        (default for https)
        path      /hello
        query     ref=home
        fragment  top        (never sent to the server)`,
      try: `
        // In the browser console:
        new URL('https://example.com/hello?ref=home#top')`
    },
    {
      chapter: 'read',
      title: 'Check HSTS and the HTTP cache',
      work: ['browser'],
      say: { browser: 'Cache miss. Going to the network.' },
      text: `
        <p>Before sending anything, the browser checks what it already knows about this site.</p>
        <p>If the site is on the <b>HSTS</b> list, any <code>http://</code> URL is upgraded to <code>https://</code> locally. If a <b>service worker</b> is registered, it can answer the request itself. If the <b>HTTP cache</b> holds a fresh copy, the page is shown without touching the network.</p>
        <p>Here nothing matches, so the browser needs the network. First problem: it has a hostname, but packets are routed by <b>IP address</b>.</p>`,
      why: `<p>The fastest request is the one that's never sent. Correct <code>Cache-Control</code> headers decide whether repeat visits cost zero, one, or many round trips.</p>`,
      tech: `
        <ul>
          <li><b>HSTS</b> (RFC 6797): the site sends <code>Strict-Transport-Security</code>; browsers also ship a preload list, so even the first visit is never plain HTTP.</li>
          <li><b>Freshness</b>: a cached response is fresh while its age is below <code>max-age</code>. A stale one can be revalidated with <code>If-None-Match</code> (ETag) or <code>If-Modified-Since</code>, and a <code>304 Not Modified</code> answer reuses the cached body.</li>
          <li>Browser caches are <b>partitioned</b> by top-level site, so a resource cached by one site isn't reused by another.</li>
        </ul>`,
      try: `
        chrome://net-internals/#hsts      query a domain's HSTS state
        DevTools → Network → "Size" column shows "(disk cache)"`
    },

    /* ================= DNS lookup ================= */
    {
      chapter: 'find',
      title: 'Ask the operating system for the IP',
      proto: 'getaddrinfo()',
      packets: [{ path: ['browser', 'os'], label: 'getaddrinfo("example.com")' }],
      say: { os: 'Not in cache or hosts file.' },
      text: `
        <p>The browser checks its own DNS cache, then asks the operating system. The OS has a small <b>stub resolver</b>: it checks the <code>hosts</code> file and its own cache.</p>
        <p>None of them have an answer, so the stub resolver will ask a <b>recursive resolver</b> on the network: usually your ISP's, handed out by the router through DHCP, or a public one like <code>1.1.1.1</code>.</p>`,
      why: `<p>Lookups are cached at several layers, each with its own expiry. When a DNS change "hasn't propagated", it's usually one of these caches still holding the old answer.</p>`,
      tech: `
        <ul>
          <li>Chrome can resolve DNS itself (its built-in async resolver) or call <code>getaddrinfo()</code>; both end up querying the configured resolver.</li>
          <li>Lookup order on Linux is set in <code>/etc/nsswitch.conf</code> (<code>hosts: files dns</code>). macOS uses <code>mDNSResponder</code>; Windows uses the DNS Client service.</li>
          <li>The resolver's address comes from DHCP (option 6) or manual configuration.</li>
        </ul>`,
      inspectTitle: 'Lookup order',
      inspect: `
        1. browser DNS cache     chrome://net-internals/#dns
        2. hosts file            /etc/hosts
        3. OS DNS cache          systemd-resolved / mDNSResponder
        4. recursive resolver    from DHCP or settings`,
      try: `
        cat /etc/resolv.conf             # which resolver you use (Linux/macOS)
        scutil --dns | head -20          # macOS
        resolvectl status                # systemd-resolved`
    },
    {
      chapter: 'find',
      title: 'Find the gateway with ARP',
      proto: 'ARP · Layer 2',
      packets: [
        { path: ['os', 'router'], label: 'Who has 192.168.1.1?' },
        { path: ['router', 'os'], label: 'is-at aa:bb:cc:dd:ee:01', reply: true }
      ],
      text: `
        <p>The resolver isn't on your local network, so the packet has to go through the <b>default gateway</b>: your router.</p>
        <p>On Ethernet and Wi-Fi, frames are addressed by <b>MAC address</b>, not IP. To learn the router's MAC address, the OS broadcasts an <b>ARP</b> request ("who has 192.168.1.1?") and the router replies. The result is cached, so this happens rarely.</p>`,
      why: `<p>This is the boundary between Layer 2 (local delivery by MAC) and Layer 3 (routing by IP). The IP header keeps the final destination, but every hop rewrites the Ethernet header with the next device's MAC.</p>`,
      tech: `
        <ul>
          <li>The OS checks its routing table: the destination isn't in the local subnet (e.g. <code>192.168.1.0/24</code>), so the next hop is the default route.</li>
          <li>ARP (RFC 826) is a broadcast to <code>ff:ff:ff:ff:ff:ff</code>; the reply is unicast. Entries expire after a few minutes.</li>
          <li>IPv6 uses <b>Neighbor Discovery</b> (ICMPv6) instead of ARP.</li>
        </ul>`,
      inspectTitle: 'ARP request and reply',
      inspect: `
        Ether dst ff:ff:ff:ff:ff:ff  ARP who-has 192.168.1.1 tell 192.168.1.23
        Ether dst 3c:22:fb:10:0a:5e  ARP 192.168.1.1 is-at aa:bb:cc:dd:ee:01`,
      try: `
        netstat -rn | grep default      # your default gateway
        arp -a                          # cached IP → MAC entries`
    },
    {
      chapter: 'find',
      title: 'Query the recursive resolver',
      proto: 'DNS · UDP :53',
      packets: [{ path: ['os', 'router', 'resolver'], label: 'A? example.com' }],
      say: { resolver: 'Cache miss. Resolving.' },
      text: `
        <p>The OS sends a DNS query, a small <b>UDP</b> datagram to port 53, asking for the <b>A record</b> (IPv4 address) of <code>example.com</code>. It usually sends an <b>AAAA</b> query (IPv6) at the same time.</p>
        <p>On the way out, the router applies <b>NAT</b>: it replaces your private source address with its public one and remembers the mapping, so the reply can be sent back to your machine.</p>`,
      why: `<p>Plain DNS is unencrypted, so anyone on the path can see which sites you look up. DNS over HTTPS (DoH) and DNS over TLS (DoT) fix that, and most browsers can use DoH.</p>`,
      tech: `
        <ul>
          <li>The query has a random 16-bit <b>ID</b> and a random source port, both of which the answer must match. This defends against cache-poisoning.</li>
          <li>The <b>RD</b> (recursion desired) flag asks the resolver to do the full lookup on our behalf.</li>
          <li>Responses larger than the UDP limit set the <b>TC</b> flag, and the client retries over TCP. EDNS0 raises the limit.</li>
        </ul>`,
      inspectTitle: 'Query (and NAT rewrite)',
      inspect: `
        ;; ->>HEADER<<- opcode: QUERY, id: 48211
        ;; flags: rd; QUERY: 1
        ;; QUESTION SECTION:
        ;example.com.            IN   A

        before NAT  192.168.1.23:51034 → 1.1.1.1:53
        after NAT   203.0.113.7:61001  → 1.1.1.1:53`,
      try: `
        dig example.com A
        dig @1.1.1.1 example.com AAAA`
    },
    {
      chapter: 'find',
      title: 'Root server: referral to .com',
      proto: 'DNS · iterative',
      packets: [
        { path: ['resolver', 'root'], label: 'A? example.com' },
        { path: ['root', 'resolver'], label: 'Referral: .com NS', reply: true }
      ],
      text: `
        <p>With nothing cached, the resolver walks the DNS hierarchy from the top. Domain names are read right to left: <code>example.com.</code> sits under <code>com</code>, which sits under the root <code>.</code>.</p>
        <p>A <b>root server</b> doesn't know <code>example.com</code>. It returns a <b>referral</b>: the name servers responsible for <code>.com</code>.</p>`,
      why: `<p>DNS is a delegated, distributed database. No single server knows every name. Each level only knows who is responsible for the level below it.</p>`,
      tech: `
        <ul>
          <li>There are 13 root server identities (<code>a</code> to <code>m.root-servers.net</code>), served by over 1,500 instances via <b>anycast</b>.</li>
          <li>Resolvers query iteratively (RD flag off) and cache referrals by their TTL. The <code>.com</code> delegation has a 2-day TTL, so in practice this hop is almost always skipped.</li>
          <li>Resolvers start from a built-in "root hints" file.</li>
        </ul>`,
      inspectTitle: 'Referral from a root server',
      inspect: `
        ;; AUTHORITY SECTION:
        com.   172800  IN  NS  a.gtld-servers.net.
        com.   172800  IN  NS  b.gtld-servers.net.
        ;; ADDITIONAL SECTION:
        a.gtld-servers.net. 172800 IN A 192.5.6.30`,
      try: `
        dig +trace example.com          # walk root → TLD → authoritative`
    },
    {
      chapter: 'find',
      title: 'TLD server: referral to the domain’s name servers',
      proto: 'DNS · iterative',
      packets: [
        { path: ['resolver', 'tld'], label: 'A? example.com' },
        { path: ['tld', 'resolver'], label: 'Referral: example.com NS', reply: true }
      ],
      text: `
        <p>The resolver asks a <code>.com</code> <b>TLD server</b>. It doesn't hold example.com's records either, but it knows which name servers are <b>authoritative</b> for it.</p>
        <p>Those are the name servers the domain owner configured at their registrar. The TLD server returns them as another referral.</p>`,
      why: `<p>When you change a domain's name servers (say, moving DNS to Cloudflare or Route 53), this delegation at the TLD is what you're changing. Its long TTL is why the switch takes time to reach everyone.</p>`,
      tech: `
        <ul>
          <li>If the name servers live inside the domain itself (<code>ns1.example.com</code>), the TLD also returns their IPs as <b>glue records</b> to avoid a chicken-and-egg loop.</li>
          <li>With DNSSEC, the TLD also returns a <b>DS</b> record: a hash of the child zone's key, linking the chain of trust.</li>
        </ul>`,
      inspectTitle: 'Referral from the .com server',
      inspect: `
        ;; AUTHORITY SECTION:
        example.com.      172800 IN NS  ns1.example.com.
        example.com.      172800 IN NS  ns2.example.com.
        ;; ADDITIONAL SECTION (glue):
        ns1.example.com.  172800 IN A   198.51.100.53`,
      try: `
        dig @a.gtld-servers.net example.com NS +norecurse`
    },
    {
      chapter: 'find',
      title: 'Authoritative server: the answer',
      proto: 'DNS · UDP :53',
      packets: [
        { path: ['resolver', 'auth'], label: 'A? example.com' },
        { path: ['auth', 'resolver'], label: 'A 198.51.100.20 · TTL 300', reply: true }
      ],
      say: { auth: 'A 198.51.100.20, TTL 300s' },
      text: `
        <p>The <b>authoritative name server</b> holds the actual records for <code>example.com</code>. It answers with the IP address and a <b>TTL</b> (time to live): how many seconds resolvers and clients may cache this answer.</p>
        <p>The response has the <b>AA</b> (authoritative answer) flag set, meaning it came from the source of truth rather than a cache.</p>`,
      why: `<p>TTL is a trade-off. Short TTLs (60 to 300 s) let you fail over or move traffic quickly; long TTLs cut lookup latency and load. Lower it before a planned migration.</p>`,
      tech: `
        <ul>
          <li>Often the answer is a <b>CNAME</b> (e.g. to a CDN hostname) that the resolver must chase to an A/AAAA record.</li>
          <li>GeoDNS and CDNs can return different IPs depending on the resolver's location (or the client subnet via EDNS Client Subnet).</li>
          <li>With <b>DNSSEC</b>, an RRSIG signature accompanies the record and the resolver validates it up to the root's key.</li>
        </ul>`,
      inspectTitle: 'Authoritative answer',
      inspect: `
        ;; flags: qr aa; ANSWER: 1
        ;; ANSWER SECTION:
        example.com.     300    IN    A    198.51.100.20
                         └ TTL in seconds`,
      try: `
        dig @ns1.example.com example.com A +norecurse`
    },
    {
      chapter: 'find',
      title: 'The answer returns and is cached',
      proto: 'DNS · UDP :53',
      packets: [{ path: ['resolver', 'router', 'os', 'browser'], label: '198.51.100.20', reply: true }],
      say: { browser: 'Connecting to 198.51.100.20:443' },
      text: `
        <p>The resolver returns the address. The router reverses its NAT mapping and forwards the reply to your machine. The resolver, the OS and the browser each cache the answer for up to its TTL.</p>
        <p>A full uncached lookup can take 50 to 200 ms. A cached one takes close to zero, which is why repeat visits feel faster.</p>`,
      why: `<p>If both A and AAAA records came back, the browser races IPv6 and IPv4 connections (<b>Happy Eyeballs</b>, RFC 8305) and uses whichever connects first, so a broken IPv6 path doesn't stall the page.</p>`,
      tech: `
        <ul>
          <li>Negative answers (NXDOMAIN) are cached too, for the zone's SOA minimum TTL.</li>
          <li>Browsers may also query an <b>HTTPS</b> (SVCB) record, which can advertise HTTP/3 support and Encrypted Client Hello keys before connecting.</li>
          <li>The resolution timeline is visible in DevTools: Network → Timing → "DNS Lookup".</li>
        </ul>`,
      try: `
        curl -w 'dns: %{time_namelookup}s\\n' -o /dev/null -s https://example.com`
    },

    /* ================= TCP handshake ================= */
    {
      chapter: 'connect',
      title: 'SYN: open a connection',
      proto: 'TCP :443',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'SYN seq=1000' }],
      text: `
        <p>IP is best-effort: packets can be lost, duplicated or reordered. <b>TCP</b> builds a reliable, ordered byte stream on top of it, and both sides first need to agree on starting <b>sequence numbers</b>.</p>
        <p>The browser sends a <b>SYN</b> segment to port 443 with a random initial sequence number. The IP usually belongs to a <b>CDN edge</b> or load balancer close to you, not to the application server itself.</p>`,
      why: `<p>Each handshake costs a full round trip (RTT) before any data moves. On a 100 ms mobile link that's 100 ms of waiting, which is why connection reuse matters so much.</p>`,
      tech: `
        <ul>
          <li>The SYN carries options: <b>MSS</b> (max segment size), <b>window scale</b>, <b>SACK permitted</b>, and timestamps.</li>
          <li>Randomised initial sequence numbers (RFC 6528) prevent off-path attackers from guessing them and injecting data.</li>
          <li>The OS picks an ephemeral source port (e.g. 49152 to 65535); the 4-tuple (src IP, src port, dst IP, dst port) identifies the connection.</li>
        </ul>`,
      inspectTitle: 'TCP segment',
      inspect: `
        203.0.113.7:61544 → 198.51.100.20:443
        Flags [S], seq 1000, win 65535,
        options [mss 1460, sackOK, TS val 1 ecr 0, nop, wscale 7]`,
      try: `
        sudo tcpdump -n 'tcp[tcpflags] & tcp-syn != 0 and port 443'
        curl -w 'connect: %{time_connect}s\\n' -o /dev/null -s https://example.com`
    },
    {
      chapter: 'connect',
      title: 'SYN-ACK: the server agrees',
      proto: 'TCP :443',
      packets: [{ path: ['cdn', 'router', 'browser'], label: 'SYN-ACK seq=5000 ack=1001', reply: true }],
      text: `
        <p>The server replies with <b>SYN-ACK</b>. It acknowledges the browser's sequence number (<code>ack = 1001</code>, the next byte it expects) and sends its own initial sequence number.</p>
        <p>If nothing is listening on port 443, the server sends <b>RST</b> and the browser shows "connection refused". If a firewall silently drops the SYN, the browser retries with backoff and eventually times out.</p>`,
      why: `<p>"Connection refused" and "connection timed out" point to different problems: refused means the host is reachable but nothing listens on the port; timed out usually means a firewall or routing issue.</p>`,
      tech: `
        <ul>
          <li>Servers under SYN-flood attack use <b>SYN cookies</b>: they encode connection state in the sequence number instead of allocating memory before the handshake completes.</li>
          <li>Half-open connections wait in the kernel's SYN queue; completed ones move to the accept queue (sized by <code>listen()</code>'s backlog).</li>
        </ul>`,
      inspectTitle: 'TCP segment',
      inspect: `
        198.51.100.20:443 → 203.0.113.7:61544
        Flags [S.], seq 5000, ack 1001, win 65160,
        options [mss 1440, sackOK, TS val 9 ecr 1, nop, wscale 9]`
    },
    {
      chapter: 'connect',
      title: 'ACK: connection established',
      proto: 'TCP :443',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'ACK ack=5001' }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tcp' },
      text: `
        <p>The browser acknowledges the server's sequence number. Both sides are now in the <b>ESTABLISHED</b> state; the dotted line shows the open connection.</p>
        <p>From here, every byte is numbered and acknowledged. Lost segments are retransmitted, and the receiver reassembles data in order.</p>`,
      why: `<p>A new TCP connection also starts with a small <b>congestion window</b> (typically 10 segments, about 14 KB) and grows it as ACKs arrive. That's why keeping critical HTML and CSS small speeds up first render.</p>`,
      tech: `
        <ul>
          <li><b>TCP Fast Open</b> lets a repeat client send data in the SYN, but it's rarely used on the web.</li>
          <li><b>HTTP/3</b> runs over <b>QUIC</b> on UDP, merging the transport and TLS handshakes into one round trip (or zero on resumption) and avoiding TCP head-of-line blocking.</li>
        </ul>`,
      inspectTitle: 'TCP segment',
      inspect: `
        203.0.113.7:61544 → 198.51.100.20:443
        Flags [.], ack 5001, win 502
        state: ESTABLISHED  (1 RTT spent)`,
      try: `
        ss -tn state established '( dport = :443 )'    # Linux
        netstat -an | grep 443                         # macOS`
    },

    /* ================= TLS handshake ================= */
    {
      chapter: 'secure',
      title: 'ClientHello: propose encryption',
      proto: 'TLS 1.3',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'ClientHello' }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tcp' },
      text: `
        <p>The TCP connection is reliable but not private: anyone on the path can read and modify it. <b>TLS</b> adds encryption, integrity and server authentication.</p>
        <p>The browser opens with a <b>ClientHello</b>: the TLS versions and cipher suites it supports, a random value, and a <b>key share</b> for a Diffie-Hellman exchange. Sending the key share upfront is what lets TLS 1.3 finish in one round trip.</p>`,
      why: `<p>The <b>SNI</b> field tells the server which hostname you want, so one IP can host many HTTPS sites. It's sent in plaintext unless Encrypted Client Hello (ECH) is used, so network observers can see which site you're visiting.</p>`,
      tech: `
        <ul>
          <li><b>cipher_suites</b>: e.g. <code>TLS_AES_128_GCM_SHA256</code>, <code>TLS_CHACHA20_POLY1305_SHA256</code>.</li>
          <li><b>supported_groups / key_share</b>: usually X25519; newer browsers add a hybrid post-quantum group (<code>X25519MLKEM768</code>).</li>
          <li><b>ALPN</b>: the application protocols offered, <code>h2</code> and <code>http/1.1</code>.</li>
          <li><b>signature_algorithms</b>: which certificate signatures the client accepts.</li>
        </ul>`,
      inspectTitle: 'ClientHello (abridged)',
      inspect: `
        Handshake: ClientHello
          legacy_version      0x0303
          random              5f1c…a9e2 (32 bytes)
          cipher_suites       TLS_AES_128_GCM_SHA256, …
          ext server_name     example.com
          ext supported_versions  TLS 1.3, TLS 1.2
          ext key_share       x25519: 3f9a…c21e
          ext alpn            h2, http/1.1`,
      try: `
        openssl s_client -connect example.com:443 -servername example.com -tls1_3 </dev/null`
    },
    {
      chapter: 'secure',
      title: 'ServerHello, certificate and Finished',
      proto: 'TLS 1.3',
      packets: [
        { path: ['cdn', 'router', 'browser'], label: 'ServerHello + key_share', reply: true },
        { path: ['cdn', 'router', 'browser'], label: '{Certificate, Finished}', reply: true, locked: true, parallel: true }
      ],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tcp' },
      work: ['cdn'],
      text: `
        <p>The server picks a cipher suite and sends its own key share. Each side combines its private key with the other's public share (<b>ECDHE</b>) and derives the same secret, which is never sent over the network.</p>
        <p>Everything after the ServerHello is <b>already encrypted</b>: the server's <b>certificate</b>, a <b>CertificateVerify</b> signature proving it holds the certificate's private key, and <b>Finished</b>, a MAC over the whole handshake.</p>`,
      why: `<p>Because the keys come from ephemeral Diffie-Hellman values, TLS 1.3 has <b>forward secrecy</b>: stealing the server's private key later doesn't decrypt previously recorded traffic.</p>`,
      tech: `
        <ul>
          <li>Keys are derived with <b>HKDF</b> into separate handshake and application traffic secrets for each direction.</li>
          <li><b>EncryptedExtensions</b> carries the ALPN choice (<code>h2</code>).</li>
          <li>The server may staple an <b>OCSP</b> response to prove the certificate isn't revoked.</li>
          <li>The certificate's public key is typically ECDSA P-256 or RSA-2048.</li>
        </ul>`,
      inspectTitle: 'Server flight',
      inspect: `
        ServerHello            TLS_AES_128_GCM_SHA256, key_share x25519 8b02…
        ── encrypted with handshake keys ──
        EncryptedExtensions    alpn: h2
        Certificate            CN=example.com  +  intermediate
        CertificateVerify      ecdsa_secp256r1_sha256
        Finished               HMAC(transcript)`
    },
    {
      chapter: 'secure',
      title: 'Verify the certificate chain',
      proto: 'X.509 · PKI',
      work: ['browser'],
      say: { browser: 'Chain valid. Hostname matches.' },
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tcp' },
      text: `
        <p>Encryption alone doesn't help if you're talking to an impostor. The browser verifies that the certificate is for <code>example.com</code>, is within its validity dates, and chains through an intermediate to a <b>root CA</b> that is already in the device's trust store.</p>
        <p>It also checks the CertificateVerify signature against the certificate's public key. Any failure produces the full-page "Your connection is not private" warning.</p>`,
      why: `<p>A common production bug is a server that doesn't send its intermediate certificate. Browsers sometimes work around it, while curl and mobile apps fail. Always serve the full chain.</p>`,
      tech: `
        <ul>
          <li>The hostname must match a <b>Subject Alternative Name</b> entry (wildcards cover one label: <code>*.example.com</code>).</li>
          <li>Revocation: OCSP stapling, CRLs, or browser-pushed lists such as Chrome's CRLSets and Firefox's CRLite.</li>
          <li><b>Certificate Transparency</b>: Chrome requires SCTs proving the certificate was published to public CT logs.</li>
        </ul>`,
      inspectTitle: 'Chain of trust',
      inspect: `
        example.com            leaf          (sent by server)
          issued by  R11       intermediate  (sent by server)
            issued by  ISRG Root X1  root    (in your trust store)

        SAN: example.com, www.example.com
        valid: 2026-09-01 → 2026-11-30`,
      try: `
        openssl s_client -connect example.com:443 -showcerts </dev/null \\
          | openssl x509 -noout -subject -issuer -dates -ext subjectAltName`
    },
    {
      chapter: 'secure',
      title: 'Client Finished: the channel is encrypted',
      proto: 'TLS 1.3',
      packets: [{ path: ['browser', 'router', 'cdn'], label: '{Finished}', locked: true }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      text: `
        <p>The browser sends its own <b>Finished</b> message. The handshake is complete, and both sides switch to application traffic keys. The green tunnel marks the encrypted channel.</p>
        <p>Observers can still see the IP addresses, the timing and sizes of packets, and (without ECH) the hostname from SNI. They can't see the URL path, headers, cookies or content.</p>`,
      why: `<p>TLS 1.3 takes one round trip; TLS 1.2 needed two. On resumption, a <b>session ticket</b> allows <b>0-RTT</b> early data, which is fast but replayable, so servers should only accept it for idempotent requests.</p>`,
      tech: `
        <ul>
          <li>Records are protected with an <b>AEAD</b> cipher (AES-GCM or ChaCha20-Poly1305), giving confidentiality and integrity together.</li>
          <li>Each record has an implicit sequence number, so reordering or replay inside the connection is detected.</li>
          <li>Total cost so far on a fresh connection: 1 RTT for TCP + 1 RTT for TLS.</li>
        </ul>`,
      try: `
        curl -w 'tls done: %{time_appconnect}s\\n' -o /dev/null -s https://example.com`
    },

    /* ================= HTTP & backend ================= */
    {
      chapter: 'ask',
      title: 'Send the HTTP request',
      proto: 'HTTP/2',
      packets: [{ path: ['browser', 'router', 'cdn'], label: 'GET /hello', locked: true }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      text: `
        <p>Now the actual request. ALPN selected <b>HTTP/2</b>, so the request is sent as binary <b>HEADERS</b> frames on a stream inside the single connection. Many requests can be in flight on the same connection at once.</p>
        <p>The headers say what the browser accepts (content types, compression, languages) and carry any <b>cookies</b> previously set for this site. Cookies are how a server recognises your session.</p>`,
      why: `<p>HTTP/2 multiplexing removed the need for tricks like domain sharding and sprite sheets. HTTP/1.1 could only have one request in flight per connection, so browsers opened up to six connections per host.</p>`,
      tech: `
        <ul>
          <li>Pseudo-headers (<code>:method</code>, <code>:path</code>, <code>:authority</code>, <code>:scheme</code>) replace the HTTP/1.1 request line and <code>Host</code> header.</li>
          <li>Headers are compressed with <b>HPACK</b> (QPACK in HTTP/3), so repeated headers like cookies cost only a few bytes.</li>
          <li>Each stream has a priority, and flow control applies per stream and per connection.</li>
        </ul>`,
      inspectTitle: 'HEADERS frame, stream 1',
      inspect: `
        :method           GET
        :scheme           https
        :authority        example.com
        :path             /hello
        user-agent        Mozilla/5.0 (…) Chrome/…
        accept            text/html,application/xhtml+xml,…
        accept-encoding   gzip, deflate, br, zstd
        accept-language   en-IN,en;q=0.9
        cookie            session=8f2c…`,
      try: `
        curl -v --http2 https://example.com/ -o /dev/null
        DevTools → Network → click the request → Headers`
    },
    {
      chapter: 'ask',
      title: 'The edge forwards to the origin',
      proto: 'Reverse proxy',
      packets: [{ path: ['cdn', 'app'], label: 'GET /hello + X-Forwarded-For' }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      say: { cdn: 'Cache MISS. Forwarding to origin.' },
      text: `
        <p>The CDN edge (or load balancer) <b>terminates TLS</b>: it decrypts the request. It checks its cache first. A hit would be answered right here, from a data centre near you.</p>
        <p>On a miss, it applies its rules (WAF, rate limits, redirects), picks a healthy <b>origin</b> server, and forwards the request over a pooled, already-open connection.</p>`,
      why: `<p>Because the proxy opens a new connection to the backend, the app sees the proxy's IP. The original client IP travels in <code>X-Forwarded-For</code> (or the standard <code>Forwarded</code> header), which the app should trust only from known proxies.</p>`,
      tech: `
        <ul>
          <li>Load-balancing algorithms: round robin, least connections, consistent hashing; unhealthy backends are removed by <b>health checks</b>.</li>
          <li>Layer 7 balancers (like this one) route on HTTP data such as path and headers; Layer 4 balancers only see IPs and ports.</li>
          <li>The cache key is usually method + host + path + query, plus anything listed in <code>Vary</code>.</li>
        </ul>`,
      inspectTitle: 'Forwarded request',
      inspect: `
        GET /hello HTTP/1.1
        Host: example.com
        X-Forwarded-For: 203.0.113.7
        X-Forwarded-Proto: https
        X-Request-ID: 7c1e…`,
      try: `
        curl -sI https://www.cloudflare.com | grep -i -E 'cf-cache-status|age|server'`
    },
    {
      chapter: 'ask',
      title: 'The application queries the database',
      proto: 'SQL · :5432',
      packets: [
        { path: ['app', 'db'], label: 'SELECT … WHERE slug=$1' },
        { path: ['db', 'app'], label: '1 row · 2 ms', reply: true }
      ],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      work: ['app'],
      text: `
        <p>The web framework <b>routes</b> <code>/hello</code> to a handler. Middleware runs first: parsing the session cookie, authentication, logging.</p>
        <p>The handler then fetches the data it needs, here from <b>PostgreSQL</b> over a pooled connection. Real apps often also hit a cache (Redis) or other internal services.</p>`,
      why: `<p>This is usually where server time goes. The classic mistake is the <b>N+1 query</b>: one query for a list, then one more per item. Batch queries, add indexes, and cache what you can.</p>`,
      tech: `
        <ul>
          <li><b>Connection pools</b> avoid paying TCP, TLS and authentication costs on every query.</li>
          <li><b>Prepared statements</b> (<code>$1</code> placeholders) separate code from data and prevent SQL injection.</li>
          <li>An index on <code>pages(slug)</code> turns a full table scan into a B-tree lookup.</li>
        </ul>`,
      inspectTitle: 'Query',
      inspect: `
        SELECT title, body, updated_at
        FROM   pages
        WHERE  slug = $1          -- $1 = 'hello'
        LIMIT  1;
        -- Index Scan using pages_slug_idx  (2.1 ms)`,
      try: `
        EXPLAIN ANALYZE SELECT * FROM pages WHERE slug = 'hello';`
    },
    {
      chapter: 'ask',
      title: 'The app builds the response',
      proto: 'HTTP 200',
      packets: [{ path: ['app', 'cdn'], label: '200 OK · text/html', reply: true }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      say: { cdn: 'Cached for 60 s (max-age).' },
      text: `
        <p>The handler renders HTML, from a template or a server-side rendered framework, and returns it with a <b>status code</b> and headers.</p>
        <p>The <code>Cache-Control</code> header tells the CDN and the browser whether they may store the response and for how long. Here the edge keeps it for 60 seconds, so the next visitor doesn't reach the origin at all.</p>`,
      why: `<p>Caching headers are one of the highest-leverage settings in web performance. A 60-second edge cache on a popular page can cut origin traffic by orders of magnitude.</p>`,
      tech: `
        <ul>
          <li><code>s-maxage</code> applies only to shared caches (CDNs); <code>private</code> forbids them; <code>no-store</code> forbids all caching.</li>
          <li><code>stale-while-revalidate</code> lets caches serve a slightly stale copy while refreshing in the background.</li>
          <li><code>Set-Cookie</code> responses are usually not cached by CDNs unless configured to.</li>
        </ul>`
    },
    {
      chapter: 'ask',
      title: 'The response reaches the browser',
      proto: 'HTTP/2',
      packets: [{ path: ['cdn', 'router', 'browser'], label: '200 OK · 14 KB (br)', reply: true, locked: true }],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      text: `
        <p>The edge compresses the HTML (Brotli or gzip), encrypts it, and streams it back as HTTP/2 <b>DATA</b> frames. TCP splits it into segments and the browser acknowledges them as they arrive.</p>
        <p>The browser doesn't wait for the full response: it starts parsing as soon as the first bytes arrive. The time until that first byte is <b>TTFB</b>.</p>`,
      why: `<p>TTFB is DNS + TCP + TLS + request travel + server time. It's the most common metric for "is the backend slow or the network?". Check the DevTools timing breakdown before optimising either.</p>`,
      tech: `
        <ul>
          <li>Brotli typically compresses HTML 15 to 25% better than gzip; <code>zstd</code> is increasingly supported.</li>
          <li><code>Set-Cookie</code> with <code>Secure; HttpOnly; SameSite=Lax</code> limits theft via JavaScript and cross-site requests.</li>
          <li>Status families: 2xx success, 3xx redirect, 4xx client error, 5xx server error.</li>
        </ul>`,
      inspectTitle: 'Response headers',
      inspect: `
        :status            200
        content-type       text/html; charset=utf-8
        content-encoding   br
        content-length     14210
        cache-control      public, max-age=60
        set-cookie         session=8f2c…; Secure; HttpOnly; SameSite=Lax
        server-timing      db;dur=2.1, app;dur=14`,
      try: `
        curl -s -o /dev/null --compressed -w \\
          'dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  ttfb %{time_starttransfer}  total %{time_total}\\n' \\
          https://example.com`
    },

    /* ================= Rendering ================= */
    {
      chapter: 'draw',
      title: 'Parse HTML and fetch sub-resources',
      proto: 'HTTP/2 · multiplexed',
      packets: [
        { path: ['browser', 'router', 'cdn'], label: 'GET /app.css', locked: true },
        { path: ['browser', 'router', 'cdn'], label: 'GET /app.js', locked: true, parallel: true },
        { path: ['browser', 'router', 'cdn'], label: 'GET /hero.webp', locked: true, parallel: true }
      ],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      work: ['browser'],
      text: `
        <p>The HTML parser builds the <b>DOM</b> tree. A <b>preload scanner</b> reads ahead for <code>&lt;link&gt;</code>, <code>&lt;script&gt;</code> and <code>&lt;img&gt;</code> tags and requests those files immediately.</p>
        <p>These requests reuse the <b>same connection</b> as parallel HTTP/2 streams: no new DNS lookup, TCP or TLS handshake.</p>`,
      why: `<p>CSS is <b>render-blocking</b>, and a plain <code>&lt;script&gt;</code> blocks parsing until it downloads and runs. Use <code>defer</code> or <code>async</code> for scripts, and keep the CSS needed for the first screen small.</p>`,
      tech: `
        <ul>
          <li><code>&lt;link rel="preload"&gt;</code> and <code>&lt;link rel="preconnect"&gt;</code> give the browser hints earlier than the scanner would find them.</li>
          <li>Resources on a <b>different origin</b> (fonts, analytics) need their own DNS + TCP + TLS setup.</li>
          <li><code>fetchpriority="high"</code> on the main image helps Largest Contentful Paint (LCP).</li>
        </ul>`,
      try: `
        DevTools → Network → Waterfall    (see parallel streams on one connection)
        DevTools → Network → right-click headers → enable "Protocol"`
    },
    {
      chapter: 'draw',
      title: 'Style, layout, paint, composite',
      work: ['browser'],
      say: { browser: 'First contentful paint' },
      text: `
        <p>With the DOM and the CSSOM (the parsed CSS rules), the rendering engine works in stages: <b>style</b> computes the final CSS for each element, <b>layout</b> calculates every box's size and position, <b>paint</b> records drawing commands, and <b>composite</b> has the GPU combine layers into the frame you see.</p>
        <p>JavaScript then runs, attaches event handlers and may change the DOM, which can trigger parts of this pipeline again.</p>`,
      why: `<p>Changing <code>transform</code> or <code>opacity</code> only needs compositing, so it's cheap. Changing <code>width</code> or <code>top</code> forces layout. Reading layout values (like <code>offsetHeight</code>) right after writing styles forces a synchronous layout, a common cause of jank.</p>`,
      tech: `
        <ul>
          <li>Key user-facing metrics: <b>FCP</b> (first contentful paint), <b>LCP</b> (largest contentful paint), <b>INP</b> (interaction to next paint), <b>CLS</b> (layout shift).</li>
          <li>Rendering runs on the main thread; compositing and scrolling run on a separate compositor thread.</li>
          <li><code>DOMContentLoaded</code> fires when HTML is parsed and deferred scripts have run; <code>load</code> fires when all sub-resources finish.</li>
        </ul>`,
      inspectTitle: 'Rendering pipeline',
      inspect: `
        HTML ─▶ DOM ───┐
                        ├─▶ Style ─▶ Layout ─▶ Paint ─▶ Composite ─▶ pixels
        CSS  ─▶ CSSOM ─┘
        JS   ─▶ may modify DOM / CSSOM at any time`,
      try: `
        DevTools → Performance → record a page load
        DevTools → Lighthouse → check LCP, CLS, TBT`
    },
    {
      chapter: 'draw',
      title: 'Done, and what’s kept for next time',
      actors: ['browser', 'os', 'resolver', 'cdn'],
      pipe: { route: ['browser', 'router', 'cdn'], kind: 'tls' },
      say: { browser: 'Page loaded' },
      text: `
        <p>On a typical connection, a first visit costs roughly: DNS (0 to 1 RTT), TCP (1 RTT), TLS (1 RTT), the HTML request (1 RTT + server time), then more round trips for sub-resources.</p>
        <p>A lot is kept for next time: DNS answers until their TTL, the open connection (idle, ready for reuse), a TLS session ticket, cached files and cookies. A repeat visit can skip most of the steps you just watched.</p>`,
      why: `<p>Most web performance work is about removing round trips: caching, connection reuse, CDNs close to users, fewer origins, and HTTP/3. Latency, not bandwidth, usually dominates page load time.</p>`,
      tech: `
        <ul>
          <li>HTTP/2 connections stay open while idle and are closed after a timeout or with a <b>GOAWAY</b> frame; TCP closes with a FIN/ACK exchange.</li>
          <li><b>bfcache</b> (back/forward cache) can restore the whole page instantly when you navigate back.</li>
        </ul>`,
      try: `
        chrome://net-internals/#sockets    open, reusable connections
        chrome://net-export                full network log of a page load`
    }
  ]
});
