/*
 * What happens when you pay with UPI?
 *
 * Sources checked (Nov 2026):
 * - NPCI UPI Procedural Guidelines and Common Library specification (PIN captured and
 *   encrypted by NPCI's library; issuer bank verifies it).
 * - NPCI API flow as documented by member-bank implementations: ReqPay, ReqAuthDetails,
 *   RespPay; debit leg before credit leg.
 * - RBI circular DPSS.CO.PD No.629/02.01.014/2019-20 (TAT for failed transactions).
 * - NPCI circulars NPCI/2025-26/UPI/222 and 222A (dispute settlement cycles).
 * - NPCI UPI FAQs on transaction limits; NPCI circular (Apr 2025) on showing the registered payee name.
 * - Independently fact-checked against these sources before publishing.
 * Handles, names, amounts and reference numbers are illustrative.
 */
HowItWorks.mount({
  title: 'What happens when you pay with UPI',
  shortTitle: 'Paying with UPI',

  chapters: [
    { id: 'scan', title: 'Scan the QR' },
    { id: 'approve', title: 'Approve with PIN' },
    { id: 'route', title: 'Route via NPCI' },
    { id: 'move', title: 'Debit & credit' },
    { id: 'confirm', title: 'Confirm' },
    { id: 'settle', title: 'Settle & failures' }
  ],

  // [x, y, w, h] on a 1000×572 stage (wide) and a 400×420 stage (tall).
  zones: [
    { id: 'you', label: { wide: 'YOUR SIDE', tall: 'YOU' }, at: { wide: [24, 40, 232, 500], tall: [6, 6, 124, 408] } },
    { id: 'core', label: { wide: 'NPCI & RBI', tall: 'NPCI · RBI' }, at: { wide: [384, 160, 232, 340], tall: [138, 130, 124, 250] } },
    { id: 'merchant', label: { wide: 'MERCHANT’S SIDE', tall: 'MERCHANT' }, at: { wide: [744, 40, 232, 500], tall: [270, 6, 124, 408] } }
  ],

  actors: {
    app:   { label: 'Your UPI app', sub: 'PhonePe, Google Pay, Paytm…', icon: 'phone',
             at: { wide: [140, 155], tall: [68, 50] } },
    ppsp:  { label: 'Payer PSP', sub: 'bank behind your UPI ID', icon: 'bank',
             at: { wide: [140, 300], tall: [68, 200] } },
    rbank: { label: { wide: 'Your bank', tall: 'Your bank' }, sub: 'remitter bank', icon: 'bank',
             at: { wide: [140, 460], tall: [68, 350] } },
    npci:  { label: { wide: 'NPCI UPI switch', tall: 'NPCI switch' }, sub: 'routes every UPI payment', icon: 'switch',
             at: { wide: [500, 245], tall: [200, 185] } },
    rbi:   { label: 'RBI', sub: 'banks’ accounts for settlement', icon: 'reserve',
             at: { wide: [500, 420], tall: [200, 320] } },
    shop:  { label: 'Merchant', sub: 'QR code · soundbox', icon: 'shop',
             at: { wide: [860, 155], tall: [332, 50] } },
    epsp:  { label: 'Payee PSP', sub: 'bank behind their UPI ID', icon: 'bank',
             at: { wide: [860, 300], tall: [332, 200] } },
    bbank: { label: { wide: 'Merchant’s bank', tall: 'Their bank' }, sub: 'beneficiary bank', icon: 'bank',
             at: { wide: [860, 460], tall: [332, 350] } }
  },

  links: [
    ['shop', 'app'], ['app', 'ppsp'], ['ppsp', 'npci'], ['npci', 'epsp'], ['epsp', 'shop'],
    ['npci', 'rbank'], ['npci', 'bbank'], ['npci', 'rbi'], ['rbi', 'rbank'], ['rbi', 'bbank']
  ],

  steps: [
    /* ================= Scan the QR ================= */
    {
      chapter: 'scan',
      title: 'Scan the merchant’s QR code',
      proto: 'ReqValAdd',
      packets: [
        { path: ['shop', 'app'], label: 'upi://pay?pa=chaistall@okhdfcbank…' },
        { path: ['app', 'ppsp', 'npci', 'epsp'], label: 'Check chaistall@okhdfcbank' },
        { path: ['epsp', 'npci', 'ppsp', 'app'], label: 'Valid · "Chai Stall"', reply: true }
      ],
      say: { app: 'Paying Chai Stall. Enter amount' },
      text: `
        <p>You scan the printed QR code at a tea stall to pay ₹250. The QR code is just text: a <b>UPI payment link</b> that holds the merchant's <b>UPI ID</b> (also called a VPA, Virtual Payment Address) and name. Decoding it happens on your phone.</p>
        <p>Before showing the confirm screen, most apps run a quick look-up through UPI to check that the UPI ID exists and fetch the payee's <b>registered name</b>, so you can see who you're really paying. No money moves at this stage. This is a printed (static) QR, so you type the amount yourself.</p>`,
      why: `<p>A UPI ID like <code>chaistall@okhdfcbank</code> lets you pay someone without knowing their bank account number or IFSC. The part after the <code>@</code> (the <b>handle</b>) tells UPI which bank manages that ID.</p>
        <p>You never need your UPI PIN to <b>receive</b> money. A QR code or request that asks for your PIN "to receive a refund" is a scam.</p>`,
      tech: `
        <ul>
          <li>The link follows NPCI's UPI linking specification: <code>pa</code> (payee UPI ID) and <code>pn</code> (payee name) are always required. A <b>dynamic</b> QR (shown on a billing screen, with a fixed amount) must also carry <code>am</code> (amount) and <code>tr</code> (order reference). <code>cu</code> (currency, only INR) and <code>mc</code> (merchant category code) are optional. Newer versions add fields for signed, verified QR codes.</li>
          <li>A <b>static</b> QR, like a printed sticker, usually has no amount, so you type it.</li>
          <li>The look-up uses the <b>Validate Address</b> API (ReqValAdd). An NPCI circular from April 2025 requires apps to show the bank-registered name it returns for person-to-person and small-merchant payments.</li>
          <li>The same link format is used when a website or app opens your UPI app directly ("UPI intent").</li>
        </ul>`,
      inspectTitle: 'What the QR code contains',
      inspect: `
        upi://pay?pa=chaistall@okhdfcbank
                 &pn=Chai%20Stall
                 &cu=INR

        (static QR: no amount, you type ₹250)`,
      try: `
        Scan any shop's UPI QR with a plain QR-reader app (not a UPI app):
        it shows the upi://pay?... link instead of opening a payment.`
    },

    /* ================= Approve with PIN ================= */
    {
      chapter: 'approve',
      title: 'Enter your UPI PIN',
      work: ['app'],
      say: { app: 'PIN encrypted on this phone' },
      text: `
        <p>You confirm the amount and type your <b>UPI PIN</b>. The PIN pad you see is not really the app's own screen. It belongs to <b>NPCI's Common Library</b>, a secure component every UPI app must embed.</p>
        <p>The library encrypts the PIN on your phone. The app, its servers and its partner bank never see the PIN itself. Only <b>your bank</b> can check whether it's correct.</p>`,
      why: `<p>UPI uses two factors. The first is <b>something you have</b>: your phone, bound to your SIM and bank account when you set up the app. For most payments the second is <b>something you know</b>: your PIN. A stolen PIN is useless without your phone.</p>
        <p>Some apps now also let you approve smaller payments with your phone's fingerprint or face unlock instead of the PIN, and <b>UPI Lite</b> allows small PIN-less payments from a small balance kept on the device.</p>`,
      tech: `
        <ul>
          <li><b>Device binding</b>: during setup, the app sends an SMS from your phone's SIM to confirm the mobile number registered with your bank, and ties your UPI profile to that device.</li>
          <li>The Common Library encrypts the PIN with NPCI's public key and returns only the encrypted credential block to the app. NPCI re-encrypts it, inside hardware security modules, so that only the issuing bank can decrypt and verify it.</li>
          <li>Apps only forward the encrypted block; they can't read it.</li>
        </ul>`
    },

    /* ================= Route via NPCI ================= */
    {
      chapter: 'route',
      title: 'Your app sends the payment request',
      proto: 'ReqPay',
      packets: [
        { path: ['app', 'ppsp'], label: 'Pay ₹250 to chaistall@…' },
        { path: ['ppsp', 'npci'], label: 'ReqPay' }
      ],
      text: `
        <p>The app sends the payment over an encrypted connection to its <b>payer PSP</b> (Payment Service Provider): the bank that issued your UPI ID and connects the app to UPI.</p>
        <p>The PSP knows which bank account your UPI ID is linked to. It adds those details, along with the encrypted PIN block, and sends a <b>ReqPay</b> request to the <b>NPCI UPI switch</b>, the central system that routes every UPI payment in India.</p>`,
      why: `<p>Apps like PhonePe or Google Pay aren't banks. They're <b>third-party app providers (TPAPs)</b> that work with partner "sponsor" banks. That's why a Google Pay UPI ID ends in a bank handle such as <code>@okaxis</code> or <code>@okhdfcbank</code>.</p>`,
      tech: `
        <ul>
          <li>NPCI (National Payments Corporation of India) runs UPI under RBI oversight. Banks and PSPs connect to its switch through defined APIs; ReqPay starts a payment.</li>
          <li>Every request carries a unique transaction ID, so retries and status checks refer to the same payment.</li>
          <li>Most payments are capped at ₹1 lakh per transaction. NPCI allows higher limits (up to ₹5 lakh) for specific categories, and banks can set lower daily limits.</li>
        </ul>`,
      inspectTitle: 'ReqPay (simplified)',
      inspect: `
        <upi:ReqPay>
          <Txn id="AXI8f2c…" type="PAY" note="tea"/>
          <Payer addr="asha@okaxis" name="Asha">
            <Ac IFSC="SBIN0001234" ACNUM="XXXX4521"/>
            <Creds><Cred type="PIN"><Data>[encrypted]</Data></Cred></Creds>
            <Amount value="250.00" curr="INR"/>
          </Payer>
          <Payees><Payee addr="chaistall@okhdfcbank"/></Payees>
        </upi:ReqPay>`
    },
    {
      chapter: 'route',
      title: 'NPCI finds the merchant’s account',
      proto: 'ReqAuthDetails',
      packets: [
        { path: ['npci', 'epsp'], label: 'Who is chaistall@okhdfcbank?' },
        { path: ['epsp', 'npci'], label: 'Account at merchant’s bank', reply: true }
      ],
      text: `
        <p>NPCI reads the handle after the <code>@</code> to work out which <b>payee PSP</b> manages the merchant's UPI ID. It asks that PSP to resolve the address.</p>
        <p>The payee PSP looks up the bank account linked to <code>chaistall@okhdfcbank</code> and returns it to NPCI. Your app never sees the merchant's account number.</p>`,
      why: `<p>This is <b>address resolution</b>, similar to DNS turning a name into an IP address. A person can change their bank account behind the same UPI ID, and anyone paying them doesn't need to know.</p>`,
      tech: `
        <ul>
          <li>The API is <b>ReqAuthDetails</b>, answered with <b>RespAuthDetails</b>. It translates a PSP-specific address into account details NPCI can route on.</li>
          <li>If the ID doesn't exist or is blocked, the payment fails here, before any money moves.</li>
        </ul>`
    },

    /* ================= Debit & credit ================= */
    {
      chapter: 'move',
      title: 'Your bank checks the PIN and debits you',
      proto: 'ReqPay · debit',
      packets: [
        { path: ['npci', 'rbank'], label: 'Debit ₹250 + PIN block' },
        { path: ['rbank', 'npci'], label: 'Debit successful', reply: true }
      ],
      work: ['rbank'],
      text: `
        <p>NPCI sends a <b>debit request</b> to your bank (the <b>remitter bank</b>). Your bank decrypts and checks your PIN, checks your balance and limits, and takes ₹250 from your account.</p>
        <p>It replies to NPCI with the result. Errors like "incorrect PIN" or "insufficient balance" come from this step.</p>`,
      why: `<p>The debit always happens <b>before</b> the credit. If the debit fails, the payment stops and nothing else happens, so the merchant can never be credited unless your account was debited first.</p>`,
      tech: `
        <ul>
          <li>The PIN is verified only by the bank that holds your account, never by the app, the PSP or NPCI.</li>
          <li>Banks also run their own fraud and risk checks at this point.</li>
        </ul>`
    },
    {
      chapter: 'move',
      title: 'The merchant’s bank credits them',
      proto: 'ReqPay · credit',
      packets: [
        { path: ['npci', 'bbank'], label: 'Credit ₹250' },
        { path: ['bbank', 'npci'], label: 'Credit successful', reply: true }
      ],
      text: `
        <p>Only after the debit succeeds does NPCI send a <b>credit request</b> to the merchant's bank (the <b>beneficiary bank</b>). It adds ₹250 to the merchant's account and confirms.</p>
        <p>From your point of view, the money has now moved: your balance went down and the merchant's went up, within a few seconds.</p>`,
      why: `<p>If the credit fails after your account was already debited, the money is sent back to you. A later step covers how failures and timeouts are handled.</p>`,
      tech: `
        <ul>
          <li>Customer accounts are updated in real time, but the money between the two banks hasn't actually moved yet. That happens later, in settlement.</li>
        </ul>`
    },

    /* ================= Confirm ================= */
    {
      chapter: 'confirm',
      title: 'Both sides get confirmation',
      proto: 'RespPay · ReqTxnConfirmation',
      packets: [
        { path: ['npci', 'ppsp', 'app'], label: 'Success · UPI Ref 6327…', reply: true },
        { path: ['npci', 'epsp', 'shop'], label: 'TxnConfirmation · ₹250 received', reply: true, parallel: true }
      ],
      say: { app: 'Paid ₹250 ✓', shop: '"₹250 received"' },
      text: `
        <p>NPCI sends the final result (<b>RespPay</b>) back to your payer PSP, which tells your app. You see the success screen with a <b>12-digit UPI reference number</b>.</p>
        <p>At the same time, NPCI sends a separate <b>transaction confirmation</b> (ReqTxnConfirmation) to the payee PSP, which notifies the merchant. That's when the soundbox at the counter announces the payment.</p>`,
      why: `<p>The UPI reference number identifies this payment across every bank and app involved. If anything goes wrong, it's the number your bank or app support will ask for.</p>`,
      tech: `
        <ul>
          <li>If an app doesn't get a final response in time, it asks for the status with a transaction status check (ReqChkTxn) using the same transaction ID, instead of sending a new payment.</li>
          <li>Merchants should trust the server-side notification from their PSP, not a screenshot of your success screen.</li>
        </ul>`
    },

    /* ================= Settle & failures ================= */
    {
      chapter: 'settle',
      title: 'The banks settle later, in batches',
      packets: [
        { path: ['npci', 'rbi'], label: 'Net positions for this cycle' },
        { path: ['rbi', 'rbank'], label: 'Debit net amount', parallel: true, delay: 200 },
        { path: ['rbi', 'bbank'], label: 'Credit net amount', reply: true, parallel: true, delay: 200 }
      ],
      work: ['npci'],
      text: `
        <p>Your ₹250 left your account instantly, but the real money between your bank and the merchant's bank moves later. NPCI adds up every UPI payment over a <b>settlement cycle</b> and calculates each bank's single <b>net</b> position against all the other banks.</p>
        <p>Those net amounts are then settled in the banks' own accounts at the <b>Reserve Bank of India</b>. NPCI runs several settlement cycles every day.</p>`,
      why: `<p>This is <b>deferred net settlement</b>. Simplified to two banks: if Bank A's customers paid Bank B's customers ₹10 crore and B's customers paid A's ₹9.5 crore, only ₹50 lakh actually moves between them. Netting greatly reduces the money banks need to keep ready for payments.</p>`,
      tech: `
        <ul>
          <li>Settlement is posted to the members' settlement (RTGS) accounts at RBI, which NPCI is authorised to debit and credit. Smaller banks may settle through a sponsor bank.</li>
          <li>Since circular <code>NPCI/2025-26/UPI/222</code>, the ten regular daily cycles carry only successful payments.</li>
          <li>The same circular (and addendum <code>222A</code>) moved dispute adjustments, such as refunds and chargebacks, into two separate dispute cycles.</li>
        </ul>`
    },
    {
      chapter: 'settle',
      title: 'When a payment fails or gets stuck',
      packets: [
        { path: ['npci', 'bbank'], label: 'Credit ₹250 (no response)' },
        { path: ['npci', 'rbank'], label: 'Reverse the debit' },
        { path: ['rbank', 'npci'], label: 'Reversed', reply: true }
      ],
      text: `
        <p>Sometimes the debit succeeds but the credit fails or times out. If the credit clearly failed, the debit is reversed and the money returns to your account.</p>
        <p>If the result is <b>unknown</b>, the payment shows as <b>pending</b> while the banks check and reconcile. It ends as either a success or a refund. It should never be both.</p>`,
      why: `<p>RBI sets deadlines for this. For UPI transfers where your account was debited but the beneficiary wasn't credited, the money must be auto-reversed by <b>T+1</b> (the next day). For merchant payments where your account was debited but the merchant didn't get confirmation, the deadline is <b>T+5</b>. Beyond that, the bank must pay you <b>₹100 per day</b> of delay, without you having to complain.</p>`,
      tech: `
        <ul>
          <li>Source: RBI circular DPSS.CO.PD No.629/02.01.014/2019-20, "Harmonisation of Turn Around Time (TAT) and customer compensation for failed transactions" (20 September 2019).</li>
          <li>The TAT is an outer limit; most reversals happen much sooner.</li>
          <li>If it isn't resolved, you can complain to your bank and then to the RBI Integrated Ombudsman.</li>
        </ul>`
    },
    {
      chapter: 'settle',
      title: 'Recap: one payment, end to end',
      actors: ['app', 'ppsp', 'npci', 'rbank', 'bbank', 'epsp', 'shop'],
      text: `
        <p>One ₹250 payment involved your app, your PSP, NPCI, your bank, the merchant's PSP and the merchant's bank, and later RBI. The customer-facing part usually finishes in a few seconds.</p>
        <p>The design keeps sensitive details where they belong: your PIN is only ever checked by your bank, and account numbers are hidden behind UPI IDs.</p>`,
      why: `<p>UPI separates <b>real-time processing</b> (debiting and crediting customer accounts within seconds) from <b>interbank settlement</b> (moving money between banks in periodic batches). IMPS and the UK's Faster Payments use a similar split; other systems, like Brazil's Pix, settle every payment individually in real time.</p>`,
      inspectTitle: 'The whole flow',
      inspect: `
        QR scan     app reads upi://pay link            (on your phone)
        Validate    ReqValAdd: check UPI ID, show registered name
        PIN         encrypted by NPCI Common Library    (on your phone)
        ReqPay      app → payer PSP → NPCI
        Resolve     NPCI → payee PSP: UPI ID → account
        Debit       NPCI → your bank: verify PIN, debit
        Credit      NPCI → merchant's bank: credit
        RespPay     NPCI → payer PSP → your app
        TxnConfirm  NPCI → payee PSP → merchant's soundbox
        Settlement  net positions settled at RBI, several times a day`
    }
  ]
});
