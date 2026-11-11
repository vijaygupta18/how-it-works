/*
 * Starter explainer. Copy this folder to explainers/<your-slug>/ and edit.
 * Format reference: README.md → "Flow format".
 */
HowItWorks.mount({
  title: 'Template: an app asks a server for your profile',
  shortTitle: 'Template',

  chapters: [
    { id: 'ask', title: 'Ask' },
    { id: 'answer', title: 'Answer' }
  ],

  // [x, y, w, h]. wide stage is 1000×572, tall (phones) is 400×420.
  zones: [
    { id: 'you', label: 'YOUR PHONE', at: { wide: [40, 160, 260, 260], tall: [6, 6, 388, 120] } },
    { id: 'cloud', label: 'THE COMPANY’S SERVERS', at: { wide: [380, 160, 580, 260], tall: [6, 140, 388, 270] } }
  ],

  actors: {
    app: { label: 'App', sub: 'on your phone', icon: 'phone', at: { wide: [170, 290], tall: [200, 62] } },
    api: { label: 'API server', sub: 'answers requests', icon: 'server', at: { wide: [520, 290], tall: [200, 220] } },
    db:  { label: 'Database', sub: 'stores profiles', icon: 'db', at: { wide: [820, 290], tall: [200, 340] } }
  },

  links: [['app', 'api'], ['api', 'db']],

  steps: [
    {
      chapter: 'ask',
      title: 'The app asks for your profile',
      packets: [{ path: ['app', 'api'], label: 'My profile, please' }],
      text: '<p>Plain-language explanation first. Short sentences. <b>Bold</b> the key idea.</p>',
      why: '<p>The practical consequence: performance, security, or a common bug.</p>',
      tech: '<p>Protocol-level depth for the "Under the hood" section.</p>',
      try: 'curl -v https://api.example.com/users/42',
      inspectTitle: 'The request',
      inspect: `
        GET /users/42
        Host: api.example.com`
    },
    {
      chapter: 'answer',
      title: 'The server looks it up',
      packets: [
        { path: ['api', 'db'], label: 'Find user 42' },
        { path: ['db', 'api'], label: 'Found', reply: true }
      ],
      work: ['api'],
      text: '<p>Packets play in order. Add <code>parallel: true</code> to send one together with the previous one.</p>'
    },
    {
      chapter: 'answer',
      title: 'The app shows your profile',
      packets: [{ path: ['api', 'app'], label: 'Here you go', reply: true }],
      say: { app: 'Hello, Asha!' },
      text: '<p><code>say</code> adds a speech bubble. It appears when a message arrives at that actor.</p>'
    }
  ]
});
