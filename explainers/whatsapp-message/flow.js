/*
 * How WhatsApp delivers an end-to-end encrypted message.
 *
 * Primary sources (Nov 2026):
 * - WhatsApp Encryption Overview, technical white paper, Version 10 (October 30, 2026):
 *   key types, client registration, session setup, exchanging messages, client-fanout,
 *   media, group messages (Sender Keys), verifying keys, transport security (Noise Pipes).
 * - WhatsApp Privacy Policy, "Your Messages" (undelivered messages kept up to 30 days).
 * - WhatsApp Help Center, "How to check read receipts".
 * - Meta Engineering: "How WhatsApp enables multi-device capability" (2021),
 *   "Deploying key transparency at WhatsApp" (2023).
 * Independently fact-checked against these sources before publishing.
 * Names, messages and byte strings are illustrative.
 */
HowItWorks.mount({
  title: 'How WhatsApp delivers an end-to-end encrypted message',
  shortTitle: 'WhatsApp encryption',

  chapters: [
    { id: 'keys', title: 'Publish keys' },
    { id: 'session', title: 'Start a session' },
    { id: 'send', title: 'Encrypt & send' },
    { id: 'deliver', title: 'Deliver & read' },
    { id: 'ratchet', title: 'New keys' },
    { id: 'more', title: 'Photos, groups, trust' }
  ],

  // [x, y, w, h] on a 1000×572 stage (wide) and a 400×420 stage (tall).
  zones: [
    { id: 'alice', label: 'ALICE', at: { wide: [24, 150, 232, 280], tall: [6, 130, 124, 170] } },
    { id: 'wa', label: { wide: 'WHATSAPP SERVERS', tall: 'WHATSAPP' }, at: { wide: [384, 30, 232, 512], tall: [138, 6, 124, 408] } },
    { id: 'bob', label: { wide: 'BOB (TWO DEVICES)', tall: 'BOB' }, at: { wide: [744, 80, 232, 450], tall: [270, 60, 124, 320] } }
  ],

  actors: {
    alice:  { label: { wide: 'Alice’s phone', tall: 'Alice' }, sub: 'sender', icon: 'phone',
              at: { wide: [140, 300], tall: [68, 210] } },
    keys:   { label: 'Key server', sub: 'public keys and signatures', icon: 'key',
              at: { wide: [500, 115], tall: [200, 60] } },
    chat:   { label: 'Chat server', sub: 'routes and queues messages', icon: 'server',
              at: { wide: [500, 300], tall: [200, 210] } },
    media:  { label: 'Media store', sub: 'encrypted files (blobs)', icon: 'db',
              at: { wide: [500, 465], tall: [200, 360] } },
    bphone: { label: { wide: 'Bob’s phone', tall: 'Bob phone' }, sub: 'primary device', icon: 'phone',
              at: { wide: [860, 215], tall: [332, 130] } },
    blap:   { label: { wide: 'Bob’s laptop', tall: 'Bob laptop' }, sub: 'linked device', icon: 'laptop',
              at: { wide: [860, 420], tall: [332, 290] } }
  },

  links: [
    ['alice', 'keys'], ['alice', 'chat'], ['alice', 'media'],
    ['chat', 'bphone'], ['chat', 'blap'],
    ['keys', 'bphone'], ['keys', 'blap'], ['media', 'bphone']
  ],

  steps: [
    /* ================= Publish keys ================= */
    {
      chapter: 'keys',
      title: 'Every device publishes its public keys',
      packets: [
        { path: ['bphone', 'keys'], label: 'Public keys: identity + prekeys' },
        { path: ['blap', 'keys'], label: 'Public keys + linking signatures', parallel: true }
      ],
      say: { keys: 'Public halves only' },
      text: `
        <p>Long before Alice sends anything, each of Bob's devices generated its own <b>key pairs</b> when WhatsApp was installed or linked. Each key pair has a <b>private key</b>, which never leaves the device, and a <b>public key</b>, which is safe to share.</p>
        <p>Each device uploads only the <b>public</b> keys to WhatsApp's server: a long-term <b>identity key</b>, a <b>signed prekey</b>, and a batch of <b>one-time prekeys</b>. The server stores them under Bob's account.</p>`,
      why: `<p>Publishing public keys in advance is what lets Alice start an encrypted chat with Bob even when all his devices are switched off. She never needs him to be online to agree on a key.</p>
        <p>Bob's laptop counts as a separate device with its own keys. His phone (the <b>primary device</b>) vouches for the laptop when it's linked.</p>`,
      tech: `
        <ul>
          <li>Key server, chat server and media store are split out here for clarity; the whitepaper describes them as WhatsApp's servers and a "blob store".</li>
          <li>All three are Curve25519 key pairs. The signed prekey is signed by the identity key and rotated periodically; one-time prekeys are replenished as they run out.</li>
          <li>Linking a laptop (a <b>companion device</b>), for example by QR code: the phone signs the laptop's public identity key (the "Account Signature"), and the laptop signs the phone's (the "Device Signature"). Senders check both before trusting the laptop.</li>
          <li>The primary device also signs the current list of its linked devices and re-uploads it periodically.</li>
        </ul>`,
      inspectTitle: 'Key types (whitepaper v10)',
      inspect: `
        Identity Key Pair    long-term   Curve25519, made at install
        Signed Pre Key       medium-term signed by identity key, rotated
        One-Time Pre Keys    single use  a queue, replenished as needed
        ───────────────────────────────────────────────────────────
        uploaded to server:  public keys only`
    },

    /* ================= Start a session ================= */
    {
      chapter: 'session',
      title: 'Alice fetches Bob’s public keys',
      packets: [
        { path: ['alice', 'keys'], label: 'Keys for all of Bob’s devices?' },
        { path: ['keys', 'alice'], label: 'Identity + signed prekey + 1 one-time prekey, ×2', reply: true }
      ],
      text: `
        <p>Alice types <b>"Dinner at 8?"</b> to Bob for the first time. Her phone first asks the server for Bob's public keys: for <b>each</b> of his devices, that device's identity key, signed prekey, and <b>one</b> one-time prekey.</p>
        <p>The server hands each one-time prekey out only once, then deletes it from storage. It also returns the linking signatures for Bob's laptop, and Alice's phone checks them before trusting that device.</p>`,
      why: `<p>WhatsApp encrypts to <b>devices</b>, not to people. Bob's phone and laptop each get their own encrypted copy, and so do any other devices on Alice's own account, so her messages appear there too.</p>`,
      tech: `
        <ul>
          <li>If Bob's devices have used up their one-time prekeys and haven't uploaded more, the server returns none, and the key agreement in the next step simply skips that part.</li>
          <li>If a companion device's signatures don't verify, Alice's phone won't send that device anything.</li>
        </ul>`
    },
    {
      chapter: 'session',
      title: 'Alice’s phone builds a secret only Bob can match',
      work: ['alice'],
      say: { alice: 'Session ready for both of Bob’s devices' },
      text: `
        <p>For each of Bob's devices, Alice's phone makes a fresh, throwaway <b>ephemeral key pair</b>, then does three or four <b>Diffie-Hellman (ECDH)</b> calculations (four when a one-time prekey is available) that mix her private keys with that device's public keys. Combined, they form a <b>master secret</b>.</p>
        <p>From it, the phone derives a <b>root key</b> and <b>chain keys</b> that will produce the actual encryption keys. Bob's device can compute the same master secret later, using its private keys. Nobody else can.</p>`,
      why: `<p>The master secret never crosses the network. Only public keys travel; each side computes the secret locally. This matches the Signal Protocol's <b>X3DH</b> key agreement.</p>`,
      tech: `
        <ul>
          <li>The terms that use both identity keys authenticate both sides; the terms that use Alice's ephemeral key (including the one with the one-time prekey) give forward secrecy.</li>
          <li>A "session" is set up once per pair of devices and reused, until something like an app reinstall loses its state.</li>
        </ul>`,
      inspectTitle: 'Master secret (whitepaper v10)',
      inspect: `
        master_secret =
            ECDH(I_alice,  S_bob)        identity  × signed prekey
         || ECDH(E_alice,  I_bob)        ephemeral × identity
         || ECDH(E_alice,  S_bob)        ephemeral × signed prekey
         || ECDH(E_alice,  O_bob)        ephemeral × one-time prekey
                                         (dropped if none was available)
        root key, chain keys = HKDF(master_secret)`
    },

    /* ================= Encrypt & send ================= */
    {
      chapter: 'send',
      title: 'Encrypt the message, once per device',
      work: ['alice'],
      say: { alice: 'Dinner at 8?' },
      text: `
        <p>To encrypt "Dinner at 8?", Alice's phone derives a brand-new <b>message key</b> from the chain key, then moves the chain key forward so that message key can never be recreated.</p>
        <p>It encrypts the text with <b>AES-256</b> and adds an <b>HMAC-SHA256</b> tag so any tampering is detected. It does this separately for each device, so Bob's phone and laptop get <b>different ciphertexts</b> of the same message.</p>`,
      why: `<p>This is called <b>client-fanout</b>: the sender's phone, not the server, makes one encrypted copy per device. If one of Bob's devices were compromised, its keys couldn't decrypt messages sent to his other devices.</p>`,
      tech: `
        <ul>
          <li>Message key: 80 bytes, split into a 32-byte AES-256 key, a 32-byte HMAC-SHA256 key and a 16-byte IV. AES runs in CBC mode.</li>
          <li>Until Bob replies, each message also carries Alice's ephemeral and identity public keys in its header, so Bob's device can build the matching session.</li>
        </ul>`,
      inspectTitle: 'One step of the hash ratchet',
      inspect: `
        Message Key = HMAC-SHA256(Chain Key, 0x01)   use once, then delete
        Chain Key   = HMAC-SHA256(Chain Key, 0x02)   move forward

        "Dinner at 8?"  ──AES-256-CBC + HMAC──▶  9f2c…e81a  (for Bob's phone)
                        ──AES-256-CBC + HMAC──▶  41ab…07d3  (for Bob's laptop)`
    },
    {
      chapter: 'send',
      title: 'Send to the server: one grey tick',
      proto: 'Noise Pipes',
      packets: [
        { path: ['alice', 'chat'], label: 'For Bob’s phone: 9f2c…e81a', locked: true },
        { path: ['alice', 'chat'], label: 'For Bob’s laptop: 41ab…07d3', locked: true, parallel: true },
        { path: ['chat', 'alice'], label: 'Sent', reply: true }
      ],
      say: { chat: 'I can route these, not read them', alice: 'Dinner at 8?  ✓' },
      text: `
        <p>Both ciphertexts go to WhatsApp's <b>chat server</b>, inside a second encrypted connection that Alice's phone keeps open to WhatsApp. Once the message has been sent, Alice sees <b>one grey tick</b> (✓).</p>
        <p>The server can see that the messages are addressed to Bob's two devices. It can't see "Dinner at 8?": it never has the keys.</p>`,
      why: `<p>There are two layers of encryption. The <b>end-to-end</b> layer (Signal Protocol) protects the content from everyone, WhatsApp included. The <b>transport</b> layer protects the connection between your phone and WhatsApp from anyone on the network.</p>`,
      tech: `
        <ul>
          <li>The client-server channel uses <b>Noise Pipes</b> (Curve25519, AES-GCM, SHA256) from the Noise Protocol Framework, which gives fast, lightweight connection setup and resume for long-running connections.</li>
          <li>Clients authenticate with a Curve25519 key pair, so the server stores only their public authentication key, never a password-like secret.</li>
        </ul>`
    },

    /* ================= Deliver & read ================= */
    {
      chapter: 'deliver',
      title: 'Bob’s phone is online: delivered, two grey ticks',
      packets: [
        { path: ['chat', 'bphone'], label: '9f2c…e81a', locked: true },
        { path: ['bphone', 'chat', 'alice'], label: 'Delivered', reply: true }
      ],
      work: ['bphone'],
      say: { bphone: 'Dinner at 8?', alice: 'Dinner at 8?  ✓✓' },
      text: `
        <p>Bob's phone is connected, so the server passes its copy straight on. Using Alice's public keys from the message header and its own private keys, Bob's phone computes the same master secret, derives the same message key, checks the HMAC and decrypts: <b>"Dinner at 8?"</b>.</p>
        <p>It sends back a delivery receipt, and Alice now sees <b>two grey ticks</b> (✓✓): delivered.</p>`,
      why: `<p>Once a message is delivered, WhatsApp deletes it from its servers. Bob's phone also deletes the one-time prekey Alice used, so that key can never be used again.</p>`,
      tech: `
        <ul>
          <li>Two grey ticks mean the message reached the recipient's phone <b>or</b> one of their linked devices. In a group, the second tick appears when everyone has received it.</li>
        </ul>`
    },
    {
      chapter: 'deliver',
      title: 'Bob’s laptop is offline: the server holds its copy',
      packets: [{ path: ['chat', 'blap'], label: '41ab…07d3 (when the laptop connects)', locked: true }],
      say: { chat: 'Stored encrypted, up to 30 days' },
      work: ['chat'],
      text: `
        <p>Bob's laptop is closed. Its copy waits on the chat server, still encrypted. When the laptop next connects, the server delivers it and the laptop decrypts it with its own keys.</p>
        <p>According to WhatsApp's privacy policy, an undelivered message is kept in encrypted form for <b>up to 30 days</b> while delivery is retried, and then deleted.</p>`,
      why: `<p>Store-and-forward is what makes messaging feel instant even when people are offline. Because the stored copy is end-to-end encrypted, holding it doesn't let the server read it.</p>`,
      tech: `
        <ul>
          <li>Linked devices still rely on the phone to re-sign the device list: the phone's signed list of linked devices expires (time-to-live of 35 days or less). If it isn't refreshed, senders message only the primary device until an updated list arrives.</li>
        </ul>`
    },
    {
      chapter: 'deliver',
      title: 'Bob opens the chat: blue ticks',
      packets: [{ path: ['bphone', 'chat', 'alice'], label: 'Read', reply: true }],
      say: { alice: 'Dinner at 8?  ✓✓ read' },
      text: `
        <p>When Bob opens the chat, his phone sends a <b>read receipt</b>. Alice's ticks turn <b>blue</b>.</p>
        <p>Read receipts can be turned off in Privacy settings. Even then, read receipts in group chats and play receipts for voice messages still work; there's no setting to turn those off.</p>`,
      why: `<p>Receipts travel back to Alice through WhatsApp's servers. The three tick states mean <b>sent</b>, <b>delivered</b> to at least one of the recipient's devices, and <b>read</b>. In a group, ticks turn blue only after everyone has read the message.</p>`
    },

    /* ================= Keys keep changing ================= */
    {
      chapter: 'ratchet',
      title: 'Bob replies, and the keys change again',
      packets: [
        { path: ['bphone', 'chat', 'alice'], label: 'Encrypted with a new key', locked: true },
        { path: ['bphone', 'chat', 'blap'], label: 'Copy for his own laptop', locked: true, parallel: true }
      ],
      say: { alice: 'Bob: Sure, see you!' },
      work: ['bphone'],
      text: `
        <p>Bob replies "Sure, see you!". Every message uses a <b>new message key</b> (the hash ratchet from step 4), and every time the conversation goes back and forth, both sides also do a <b>new Diffie-Hellman exchange</b> to refresh the chain keys (the DH ratchet).</p>
        <p>Bob's phone also sends an encrypted copy to his own laptop, so the reply shows up there too.</p>`,
      why: `<p>This gives <b>forward secrecy</b>. Message keys are deleted after use and can't be recalculated from the current state, so even someone who later steals the keys on a phone can't decrypt messages captured earlier.</p>`,
      tech: `
        <ul>
          <li>Each message carries the sender's current ephemeral (ratchet) Curve25519 public key; a new one is generated each time a side starts replying. When a reply arrives: <code>ephemeral_secret = ECDH(E_sender, E_recipient)</code>, then <code>Chain Key, Root Key = HKDF(Root Key, ephemeral_secret)</code>.</li>
          <li>Because of how the keys are derived, messages can arrive late, out of order, or be lost without breaking the conversation.</li>
          <li>Together, these two ratchets match the Signal Protocol's <b>Double Ratchet</b> (Signal calls the hash ratchet the "symmetric-key ratchet").</li>
        </ul>`
    },

    /* ================= Photos, groups, trust ================= */
    {
      chapter: 'more',
      title: 'Sending a photo',
      packets: [
        { path: ['alice', 'media'], label: 'Encrypted photo blob', locked: true },
        { path: ['alice', 'chat', 'bphone'], label: 'Photo keys + hash + link', locked: true },
        { path: ['alice', 'chat', 'blap'], label: 'Own copy for the laptop', locked: true, parallel: true },
        { path: ['bphone', 'media'], label: 'Download blob' },
        { path: ['media', 'bphone'], label: 'Encrypted photo blob', reply: true, locked: true }
      ],
      say: { bphone: 'Hash ✓  MAC ✓  photo decrypted' },
      text: `
        <p>Large files take a different route. Alice's phone generates <b>random keys</b> just for this photo (an AES-256 key and an HMAC key), encrypts the photo with them, and uploads the encrypted file to WhatsApp's <b>media store</b>.</p>
        <p>Then it sends each of Bob's devices an ordinary end-to-end encrypted message containing the photo's keys, a hash of the encrypted file, and a link to it. Bob's phone downloads the file, checks the hash and MAC, and decrypts it.</p>`,
      why: `<p>The big file is encrypted and uploaded <b>once</b>; only its small keys need to go in each per-device encrypted message. Every receiving device fetches the same encrypted file and decrypts it.</p>`,
      tech: `
        <ul>
          <li>Ephemeral 32-byte AES-256 key and 32-byte HMAC-SHA256 key; AES-256-CBC with a random IV; HMAC appended to the ciphertext.</li>
          <li>The message carries the encryption key, the HMAC key, a SHA256 hash of the encrypted blob, and a pointer to it in the blob store.</li>
        </ul>`
    },
    {
      chapter: 'more',
      title: 'Group chats: one ciphertext, server fan-out',
      packets: [
        { path: ['alice', 'chat'], label: 'One ciphertext (Sender Key)', locked: true },
        { path: ['chat', 'bphone'], label: 'Same ciphertext', locked: true },
        { path: ['chat', 'blap'], label: 'Same ciphertext', locked: true, parallel: true }
      ],
      text: `
        <p>In a group, encrypting every message separately for every member's every device would be slow. So the first time Alice writes in a group, her phone creates a <b>Sender Key</b> and sends it to each member device over the normal pairwise encrypted sessions.</p>
        <p>After that, she encrypts each group message <b>once</b> with her Sender Key, and the server copies the same ciphertext to every member.</p>`,
      why: `<p>The fan-out moves from the phone to the server, but the server still can't read anything: only group members received the Sender Key, and only through end-to-end encrypted messages.</p>`,
      tech: `
        <ul>
          <li>The Sender Key message carries a 32-byte chain key and the public key of a Curve25519 signature key pair. Each group message is encrypted with AES-256-CBC using a key from that chain and signed with the private signature key.</li>
          <li>When a member leaves, everyone clears their Sender Key and starts over.</li>
        </ul>`
    },
    {
      chapter: 'more',
      title: 'Checking you’re really talking to Bob',
      actors: ['alice', 'bphone', 'keys'],
      say: { alice: 'Security code matches Bob’s' },
      text: `
        <p>Everything above trusts that the key server handed Alice the <b>real</b> public keys for Bob. To check, Alice and Bob can open each other's contact info and compare a <b>security code</b>: a QR code to scan in person, or a <b>60-digit number</b> to compare remotely. If they match, nobody is in the middle.</p>
        <p>WhatsApp also runs <b>key transparency</b>: an append-only, publicly auditable directory of public keys. When you open the security-code screen, the app checks the contact's keys against it automatically.</p>`,
      why: `<p>End-to-end encryption protects the content, but you also have to be sure the "end" is the right person. Verifying keys protects against a man-in-the-middle, including one run by the server itself.</p>`,
      tech: `
        <ul>
          <li>The 60-digit number is two 30-digit fingerprints, one per user, each computed from the public identity keys of all that user's devices.</li>
          <li>The key transparency directory is called the Auditable Key Directory (AKD); Meta has published it as an open-source library (Meta Engineering, April 2023; it isn't described in the encryption whitepaper).</li>
        </ul>`,
      inspectTitle: 'How each 30-digit half is made (whitepaper v10)',
      inspect: `
        1. sort the public identity keys of all the user's devices
        2. SHA-512 (keys + user identifier), iterated 5200 times
        3. take the first 30 bytes, split into six 5-byte chunks
        4. each chunk → big-endian integer mod 100000 → 5 digits
        5. six groups of 5 digits = 30 digits`
    },
    {
      chapter: 'more',
      title: 'Recap: what WhatsApp can and can’t see',
      actors: ['alice', 'chat', 'bphone', 'blap'],
      text: `
        <p>To deliver messages, WhatsApp's servers have to know at least <b>who a message is from</b>, <b>which devices it's for</b>, and <b>when</b> it was sent. They can't read <b>what it says</b>: only Alice's and Bob's devices ever hold the keys.</p>
        <p>One caveat from WhatsApp's own whitepaper: chats with businesses that use Meta's Cloud API, and communications with Meta services such as Meta AI, are not considered end-to-end encrypted. The app shows a notice when that's the case.</p>`,
      why: `<p>End-to-end encryption protects message <b>content</b>. It doesn't hide that two people are talking. Those are different guarantees, and it's worth being precise about which one a system provides.</p>`,
      inspectTitle: 'The whole flow',
      inspect: `
        Publish     devices upload public keys (private keys stay put)
        Session     fetch keys → 3–4 × ECDH → master secret   (X3DH)
        Encrypt     new message key per message, one copy per device
        Send        ciphertexts inside a Noise channel → ✓
        Deliver     online device decrypts → receipt → ✓✓
        Offline     server holds encrypted copy, up to 30 days
        Read        read receipt → blue ✓✓
        Ratchet     new keys every message and every round trip`
    }
  ]
});
