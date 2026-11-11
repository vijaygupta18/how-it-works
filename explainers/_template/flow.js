/*
 * Starter explainer. Copy this folder to explainers/<your-slug>/ and edit.
 * Full format reference: README.md → "Flow format".
 */
HowItWorks.mount({
  title: 'Template: client calls an API',
  subtitle: 'Copy this folder to start a new explainer',

  phases: {
    request:  { label: 'Request',  color: '#2563eb' },
    work:     { label: 'Server',   color: '#b91c1c' },
    response: { label: 'Response', color: '#047857' }
  },

  // wide: 1000×560 stage (desktop / landscape). tall: 400×420 stage (phones).
  actors: {
    client: { label: 'Client', sub: 'mobile app', icon: 'phone',  at: { wide: [150, 280], tall: [70, 80] } },
    api:    { label: 'API',    sub: 'REST',       icon: 'server', at: { wide: [500, 280], tall: [200, 210] } },
    db:     { label: 'Database', sub: 'Postgres', icon: 'db',     at: { wide: [850, 280], tall: [330, 340] } }
  },

  links: [['client', 'api'], ['api', 'db']],

  steps: [
    {
      phase: 'request',
      title: 'The client sends a request',
      proto: 'HTTPS',
      packets: [{ path: ['client', 'api'], label: 'GET /users/42' }],
      text: '<p>Explain what happens in plain language. <code>HTML</code> is allowed.</p>',
      inspectTitle: 'Request',
      inspect: `
        GET /users/42 HTTP/1.1
        Host: api.example.com`
    },
    {
      phase: 'work',
      title: 'The API reads from the database',
      proto: 'SQL',
      packets: [
        { path: ['api', 'db'], label: 'SELECT …' },
        { path: ['db', 'api'], label: '1 row' }
      ],
      work: ['api'],
      text: '<p>Packets play in order. Add <code>parallel: true</code> to start one together with the previous.</p>'
    },
    {
      phase: 'response',
      title: 'The client gets a response',
      packets: [{ path: ['api', 'client'], label: '200 OK' }],
      notes: { client: 'rendered' },
      text: '<p><code>notes</code> attach small tags to actors. <code>work</code> shows a spinning ring.</p>'
    }
  ]
});
