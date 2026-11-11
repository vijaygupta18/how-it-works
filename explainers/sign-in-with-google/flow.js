/*
 * What happens when you click "Sign in with Google"?
 *
 * Sources checked (Nov 2026):
 * - Google Identity: OpenID Connect server flow (developers.google.com/identity/openid-connect/openid-connect)
 * - OpenID Connect Core 1.0
 * - RFC 6749 (OAuth 2.0), §4.1.2 authorization code lifetime and single use
 * - RFC 7636 (PKCE), RFC 9700 (OAuth 2.0 Security Best Current Practice, Jan 2025)
 * - W3C Web Authentication (WebAuthn) for passkeys
 * Independently fact-checked against these sources before publishing.
 * notes.example is a fictional app; tokens and IDs are shortened and illustrative.
 */
HowItWorks.mount({
  title: 'What happens when you click "Sign in with Google"',
  shortTitle: 'Sign in with Google',

  chapters: [
    { id: 'start', title: 'Start' },
    { id: 'google', title: 'Sign in at Google' },
    { id: 'consent', title: 'Consent & code' },
    { id: 'exchange', title: 'Code for tokens' },
    { id: 'verify', title: 'Verify & log in' },
    { id: 'after', title: 'Afterwards' }
  ],

  zones: [
    { id: 'device', label: 'YOUR DEVICE', at: { wide: [24, 40, 232, 500], tall: [6, 6, 124, 262] } },
    { id: 'app', label: { wide: 'NOTES.EXAMPLE (THE APP)', tall: 'THE APP' }, at: { wide: [384, 200, 232, 240], tall: [138, 276, 124, 138] } },
    { id: 'google', label: 'GOOGLE', at: { wide: [744, 40, 232, 500], tall: [270, 6, 124, 408] } }
  ],

  actors: {
    browser: { label: 'Browser', sub: 'you, on notes.example', icon: 'browser',
               at: { wide: [140, 150], tall: [68, 50] } },
    passkey: { label: { wide: 'Your passkey', tall: 'Passkey' }, sub: 'private key on your device(s)', icon: 'key',
               at: { wide: [140, 420], tall: [68, 200] } },
    app:     { label: 'App server', sub: 'notes.example backend', icon: 'server',
               at: { wide: [500, 320], tall: [200, 330] } },
    gauth:   { label: 'Google sign-in', sub: 'accounts.google.com', icon: 'lock',
               at: { wide: [860, 150], tall: [332, 50] } },
    gtoken:  { label: { wide: 'Token endpoint', tall: 'Tokens' }, sub: 'oauth2.googleapis.com', icon: 'server',
               at: { wide: [860, 310], tall: [332, 200] } },
    gapi:    { label: 'Google APIs', sub: 'public keys, Calendar, …', icon: 'cloud',
               at: { wide: [860, 465], tall: [332, 350] } }
  },

  links: [
    ['browser', 'passkey'], ['browser', 'app'], ['browser', 'gauth'],
    ['app', 'gtoken'], ['app', 'gapi']
  ],

  steps: [
    /* ================= Start ================= */
    {
      chapter: 'start',
      title: 'You click "Sign in with Google"',
      proto: 'HTTPS',
      packets: [{ path: ['browser', 'app'], label: 'GET /login/google' }],
      text: `
        <p>You're on <code>notes.example</code> and click <b>Sign in with Google</b>. The app wants to know who you are, but it should never see your Google password.</p>
        <p>The protocol that makes this work is <b>OpenID Connect (OIDC)</b>: an identity layer built on top of <b>OAuth 2.0</b>. The variant used here, the <b>authorization code flow</b>, is the standard one for apps with a backend server.</p>`,
      why: `<p>A common interview question: <b>OAuth 2.0</b> is about <b>authorization</b>, letting an app access something on your behalf. <b>OpenID Connect</b> adds <b>authentication</b>, telling the app who you are, through an <b>ID token</b>.</p>`,
      tech: `
        <ul>
          <li>Roles in OAuth terms: you are the <b>resource owner</b>; notes.example is the <b>client</b> (in OIDC, the "Relying Party"); Google is the <b>authorization server</b> (in OIDC, the "OpenID Provider").</li>
          <li>The app was registered with Google beforehand and has a <b>client ID</b>, a <b>client secret</b>, and a list of allowed redirect URIs.</li>
        </ul>`
    },
    {
      chapter: 'start',
      title: 'The app prepares the request and redirects you',
      proto: 'HTTP 302',
      packets: [{ path: ['app', 'browser'], label: '302 → accounts.google.com/…', reply: true }],
      work: ['app'],
      text: `
        <p>The app generates three random, single-use values and remembers them in your session:</p>
        <ul>
          <li><b>state</b>: protects against cross-site request forgery. Google sends it back unchanged, and the app checks it's the same value.</li>
          <li><b>nonce</b>: Google puts it inside the ID token, so the app can tell the token was issued for this sign-in and isn't a replay.</li>
          <li><b>PKCE code verifier</b>: a secret kept by the app. Only a hash of it (base64url-encoded SHA-256), the <b>code challenge</b>, goes in the URL.</li>
        </ul>
        <p>Then it redirects your browser to Google with these values and what it's asking for.</p>`,
      why: `<p>The <code>redirect_uri</code> must exactly match one registered with Google, or the request fails with <code>redirect_uri_mismatch</code>. This stops an attacker from asking Google to send your code to their own site.</p>`,
      tech: `
        <ul>
          <li><code>scope=openid email profile</code>: <code>openid</code> makes it an OIDC request; the others ask for your email address and basic profile.</li>
          <li>PKCE (RFC 7636) protects the authorization code if it's intercepted. RFC 9700 makes PKCE a MUST for public clients (mobile apps, single-page apps) and RECOMMENDED for server-side apps like this one. Google's discovery document lists <code>S256</code> support.</li>
          <li><code>S256</code> means the challenge is <code>BASE64URL(SHA256(code_verifier))</code>, so the verifier can't be worked out from the URL.</li>
        </ul>`,
      inspectTitle: 'The redirect URL',
      inspect: `
        https://accounts.google.com/o/oauth2/v2/auth
          ?response_type=code
          &client_id=8841-abc.apps.googleusercontent.com
          &redirect_uri=https://notes.example/callback
          &scope=openid%20email%20profile
          &state=af0ifjsldkj
          &nonce=n-0S6_WzA2Mj
          &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
          &code_challenge_method=S256`
    },

    /* ================= Sign in at Google ================= */
    {
      chapter: 'google',
      title: 'Your browser takes the request to Google',
      proto: 'HTTPS',
      packets: [{ path: ['browser', 'gauth'], label: 'GET /o/oauth2/v2/auth?…' }],
      text: `
        <p>Your browser follows the redirect to <code>accounts.google.com</code>. The app and Google don't talk to each other directly yet; the browser carries the request between them.</p>
        <p>Google checks that the client ID is real and the redirect URI is registered for it. If you're already signed in to Google in this browser, Google may skip sign-in (you might still pick an account). In this walkthrough you aren't signed in yet.</p>`,
      why: `<p>OAuth has two channels. The <b>front channel</b> goes through your browser (redirects and URLs), which you and browser extensions can see. The <b>back channel</b> is direct server-to-server HTTPS. The client secret, the PKCE verifier and the tokens only travel on the back channel. The front channel carries only values designed to be safe if seen: the code challenge, <code>state</code>, <code>nonce</code>, and a short-lived, single-use code.</p>`,
      tech: `
        <ul>
          <li>Google publishes all its endpoints in a discovery document at <code>https://accounts.google.com/.well-known/openid-configuration</code>.</li>
        </ul>`,
      try: `
        curl -s https://accounts.google.com/.well-known/openid-configuration`
    },
    {
      chapter: 'google',
      title: 'You prove who you are with a passkey',
      proto: 'WebAuthn',
      packets: [
        { path: ['gauth', 'browser'], label: 'Sign this challenge', reply: true },
        { path: ['browser', 'passkey'], label: 'Challenge for Google' },
        { path: ['passkey', 'browser'], label: 'Signed challenge', reply: true },
        { path: ['browser', 'gauth'], label: 'Signature' }
      ],
      work: ['passkey'],
      say: { passkey: 'Unlocked with fingerprint' },
      text: `
        <p>Google needs to know it's really you. Here you use a <b>passkey</b> instead of a password. A passkey is a <b>key pair</b>: the <b>private key</b> stays with you, on your device or synced end-to-end encrypted between your own devices by your password manager, and is never sent to Google. Google stored only the <b>public key</b> when you created the passkey.</p>
        <p>Google sends a random <b>challenge</b>. You unlock the passkey with your fingerprint, face or screen lock (this check happens only on your device), and it signs the challenge. Google verifies the signature with your public key.</p>`,
      why: `<p>Passkeys resist phishing. The browser tells the passkey which website is asking, and a passkey made for Google will only sign for Google. A look-alike site can't get a usable signature, and nothing reusable like a password ever leaves your device.</p>`,
      tech: `
        <ul>
          <li>This is WebAuthn. The browser sends Google the signature plus <code>clientDataJSON</code> (which includes the challenge and the origin the browser actually saw) and <code>authenticatorData</code> (including a "user verified" flag).</li>
          <li>Google checks the signature, the challenge, the origin and the relying-party ID before accepting it.</li>
          <li>Without a passkey, this step would be your password, plus a second step if you've turned on 2-Step Verification. The rest of the flow is identical.</li>
          <li>Passkeys come in two kinds: <b>synced</b> (shared across your devices by a passkey provider such as iCloud Keychain or Google Password Manager) and <b>device-bound</b> (for example on a hardware security key, never leaving it).</li>
        </ul>`
    },

    /* ================= Consent & code ================= */
    {
      chapter: 'consent',
      title: 'You agree to share your details',
      packets: [{ path: ['browser', 'gauth'], label: 'Continue' }],
      say: { browser: 'Share name, email and photo with notes.example?' },
      text: `
        <p>Google shows a <b>consent screen</b> naming the app and listing what it wants: your name, email address and profile picture. These come from the <b>scopes</b> the app asked for.</p>
        <p>You click <b>Continue</b>. If you've already agreed before, Google may skip this screen.</p>`,
      why: `<p>Scopes limit what an app can get. An app that only needs to sign you in should ask for <code>openid email profile</code> and nothing more. Asking for access to your Drive or Gmail shows up here. Google requires verification for apps that request sensitive scopes, and an additional security assessment for restricted scopes such as most Gmail and Drive access.</p>`,
      tech: `
        <ul>
          <li>You can review and remove apps' access later at <code>myaccount.google.com/permissions</code>.</li>
        </ul>`
    },
    {
      chapter: 'consent',
      title: 'Google sends you back with a one-time code',
      proto: 'HTTP 302',
      packets: [
        { path: ['gauth', 'browser'], label: '302 → /callback?code=…&state=…', reply: true },
        { path: ['browser', 'app'], label: 'GET /callback?code=4/0Ad…' }
      ],
      say: { app: 'state matches ✓' },
      text: `
        <p>Google redirects your browser back to the app's <code>redirect_uri</code> with an <b>authorization code</b> and the same <code>state</code> value. The app checks that the state matches the one it stored for your session.</p>
        <p>The code isn't a token. It's a short-lived, one-time ticket that the app must exchange, directly with Google, for the real tokens.</p>`,
      why: `<p>The code travels through the browser, where it can end up in history or logs, so it's designed to be nearly useless on its own. It expires quickly, works only once, and can't be exchanged without the app's client secret and (with PKCE) the code verifier.</p>`,
      tech: `
        <ul>
          <li>RFC 6749 §4.1.2: the code "MUST expire shortly after it is issued", with a maximum lifetime of 10 minutes RECOMMENDED. The client must not use it more than once, and a reused code must be rejected.</li>
          <li>Older "implicit" flows returned tokens directly in the URL. RFC 9700 says clients SHOULD NOT use the implicit grant or any flow that returns access tokens in the URL.</li>
        </ul>`
    },

    /* ================= Code for tokens ================= */
    {
      chapter: 'exchange',
      title: 'The app trades the code for tokens',
      proto: 'POST /token',
      packets: [
        { path: ['app', 'gtoken'], label: 'code + client secret + verifier' },
        { path: ['gtoken', 'app'], label: 'access_token + id_token', reply: true }
      ],
      work: ['gtoken'],
      text: `
        <p>Now the <b>back channel</b>: the app server calls Google's token endpoint directly over HTTPS. It sends the code, its client ID and <b>client secret</b>, the redirect URI, and the PKCE <b>code verifier</b>.</p>
        <p>Google checks that the code is valid and unused, that it was issued to this client for this redirect URI, and, because a code challenge was sent, that the verifier hashes to it (RFC 7636 §4.6). Then it returns the tokens.</p>`,
      why: `<p>The client secret and the verifier never pass through your browser. Even someone who stole the code from the URL couldn't redeem it.</p>`,
      tech: `
        <ul>
          <li><b>access_token</b>: lets the app call Google APIs for the granted scopes. <code>token_type</code> is always <code>Bearer</code>.</li>
          <li><b>id_token</b>: a signed JWT that says who you are. This is the OpenID Connect part.</li>
          <li><b>expires_in</b>: the access token's remaining lifetime in seconds (about an hour).</li>
          <li><b>refresh_token</b>: present only if the app asked for <code>access_type=offline</code>. Google normally issues it only on the first authorization; to get another, the app must request <code>prompt=consent</code>.</li>
        </ul>`,
      inspectTitle: 'Token request and response',
      inspect: `
        POST https://oauth2.googleapis.com/token
          code=4/0Ad…&client_id=8841-abc…&client_secret=GOCSPX-…
          &redirect_uri=https://notes.example/callback
          &grant_type=authorization_code&code_verifier=dBjftJeZ4CVP…

        200 OK
        {
          "access_token": "ya29.a0Af…",
          "expires_in": 3599,
          "token_type": "Bearer",
          "scope": "openid https://www.googleapis.com/auth/userinfo.email …",
          "id_token": "eyJhbGciOiJSUzI1NiIs…"
        }`
    },

    /* ================= Verify & log in ================= */
    {
      chapter: 'verify',
      title: 'The app checks the ID token',
      proto: 'JWT',
      packets: [
        { path: ['app', 'gapi'], label: 'GET /oauth2/v3/certs' },
        { path: ['gapi', 'app'], label: 'Google’s public keys', reply: true }
      ],
      work: ['app'],
      text: `
        <p>The ID token is a <b>JWT</b>: three base64url parts (header, payload, signature) joined by dots. The app checks the <b>claims</b> inside:</p>
        <ul>
          <li><code>iss</code> is <code>https://accounts.google.com</code> (or <code>accounts.google.com</code>);</li>
          <li><code>aud</code> is the app's own client ID;</li>
          <li><code>exp</code> hasn't passed;</li>
          <li><code>nonce</code> matches the value it generated at the start.</li>
        </ul>
        <p>It also verifies the token's <b>signature</b> with Google's published public keys, which it caches (following the response's <code>Cache-Control</code> header) and re-fetches when they rotate.</p>`,
      why: `<p><b>Decoding a JWT is not verifying it.</b> Anyone can read or write the payload; only the signature proves Google issued it. Google's docs note that when the app gets the token directly from Google's token endpoint over HTTPS, authenticating with its client secret, it can be confident the token is genuine. Any token that arrives another way (for example, sent up by a mobile app) must have its signature checked.</p>`,
      tech: `
        <ul>
          <li>Google signs ID tokens with RS256; the public keys are at the discovery document's <code>jwks_uri</code>, <code>https://www.googleapis.com/oauth2/v3/certs</code>, and they rotate.</li>
          <li>For apps restricted to a Google Workspace domain, check the <code>hd</code> claim, not the email domain.</li>
          <li>Use a maintained library rather than hand-rolling JWT checks.</li>
        </ul>`,
      inspectTitle: 'Decoded ID token payload (abridged)',
      inspect: `
        {
          "iss": "https://accounts.google.com",
          "azp": "8841-abc.apps.googleusercontent.com",
          "aud": "8841-abc.apps.googleusercontent.com",
          "sub": "110169484474386276334",
          "email": "asha@gmail.com",
          "email_verified": true,
          "at_hash": "HK6E_P6Dh8Y93mRNtsDB1Q",
          "name": "Asha Rao",
          "nonce": "n-0S6_WzA2Mj",
          "iat": 1794380000,
          "exp": 1794383600
        }`,
      try: `
        # Read (not verify) an ID token's payload. JWTs use base64url without padding:
        python3 -c "import sys,base64,json; p=sys.argv[1].split('.')[1]; \\
          print(json.dumps(json.loads(base64.urlsafe_b64decode(p + '=' * (-len(p) % 4))), indent=2))" "$ID_TOKEN"`
    },
    {
      chapter: 'verify',
      title: 'The app logs you in with its own session',
      proto: 'Set-Cookie',
      packets: [{ path: ['app', 'browser'], label: '302 /notes + session cookie', reply: true }],
      say: { browser: 'Signed in as Asha' },
      text: `
        <p>The app looks you up by the ID token's <code>sub</code> claim, a stable ID for your Google account, and creates your account the first time.</p>
        <p>Then it starts its <b>own session</b>: it sets a session cookie and redirects you to your notes. From here, notes.example uses that cookie, not Google's tokens, to recognise you.</p>`,
      why: `<p>Identify users by <code>sub</code>, never by <code>email</code>. Google's docs are explicit: an email address can change and may not be unique to one account over time, while <code>sub</code> stays the same.</p>
        <p>Because the sessions are separate, logging out of notes.example doesn't log you out of Google, and the other way round.</p>`,
      tech: `
        <ul>
          <li>Session cookies should be <code>HttpOnly</code> (no JavaScript access), <code>Secure</code> (HTTPS only) and <code>SameSite=Lax</code> or stricter.</li>
          <li>The state, nonce and code verifier are now discarded; each is single-use.</li>
          <li>The short-lived cookie that held them before sign-in must be <code>SameSite=Lax</code>, not <code>Strict</code>: the callback is a navigation from accounts.google.com, and a Strict cookie wouldn't be sent with it.</li>
          <li>Issue a fresh session ID at login, so a session ID set before sign-in can't be reused (session fixation).</li>
        </ul>`
    },

    /* ================= Afterwards ================= */
    {
      chapter: 'after',
      title: 'Calling Google APIs with the access token',
      proto: 'Bearer token',
      packets: [
        { path: ['app', 'gapi'], label: 'GET calendar · Bearer ya29…' },
        { path: ['gapi', 'app'], label: 'Your events', reply: true }
      ],
      text: `
        <p>Sign-in only needs the ID token. But if the app also asked for, say, Google Calendar access, it calls the Calendar API with the <b>access token</b> in an <code>Authorization: Bearer</code> header.</p>
        <p>The access token expires after about an hour. With a <b>refresh token</b>, the app can get a new one without asking you again, until you revoke access or the refresh token expires (for example, after six months unused).</p>`,
      why: `<p>A bearer token works for whoever holds it, like cash. Keep access and refresh tokens on the server, never in URLs, logs or browser storage.</p>`,
      tech: `
        <ul>
          <li>Refresh: <code>POST /token</code> with <code>grant_type=refresh_token</code>.</li>
          <li>Revoking access in your Google account settings invalidates the app's refresh token.</li>
        </ul>`
    },
    {
      chapter: 'after',
      title: 'Recap: what each piece does',
      actors: ['browser', 'app', 'gauth', 'gtoken'],
      text: `
        <p>Your password, or your passkey's signature, only ever went to Google. A passkey's private key never leaves your devices. The app received a one-time code through your browser, exchanged it for tokens on a direct server-to-server channel, verified the ID token, and started its own session.</p>`,
      why: `<p>The design keeps each secret on the narrowest path possible: the client secret and PKCE verifier stay on the back channel, the code is single-use, and the ID token is bound to this app (<code>aud</code>) and this sign-in (<code>nonce</code>).</p>`,
      inspectTitle: 'Who protects against what',
      inspect: `
        state           cross-site request forgery on the callback
        nonce           replay of an old ID token; also detects injected codes
        PKCE            stolen or injected authorization codes
        redirect_uri    codes being sent to an attacker's site
        client secret   other clients redeeming this app's codes
        signature/aud   forged ID tokens, or tokens meant for other apps
        sub             account mix-ups when an email changes`
    }
  ]
});
