Skills: invoke automatically
Don't wait to be asked. Before starting a task, check the available skills and invoke every one whose description matches the work, for example:

New feature or vague request: spec-driven-development / interview-me, then planning-and-task-breakdown and incremental-implementation.
UI work: frontend-ui-engineering and a taste skill (taste-skill:design-taste-frontend); UI review: web-design-guidelines.
Bug or failing build/test: debugging-and-error-recovery; new logic: test-driven-development.
Auth, user input, data storage, uploads, third-party APIs: security-and-hardening; pre-launch: security-audit and shipping-and-launch.
API or module boundary design: api-and-interface-design.
Before finishing a change: code-review-and-quality; commits/PRs: git-workflow-and-versioning.
Anything touching Claude/Anthropic APIs: claude-api.
Design: don't look "vibecoded"
Avoid these generic AI-generated UI patterns:

No purple-to-blue gradients. Pick a deliberate, restrained palette (one accent color, neutrals).
Palette: blue tones (user's choice). One deliberate, slightly desaturated blue as the accent (think ink/ledger blue, not the default Tailwind blue-500/600 or a neon blue), cool neutrals, no gradients; check AA contrast in both themes.
No gradient hero text. Headlines are solid color; hierarchy comes from size, weight, and spacing.
No emojis in headings or as decorative bullets.
Not Inter everywhere. Choose a typeface with character for the brand; pair at most two families.
No colored-border cards (e.g. border-l-4 border-blue-500 accents).
No glassmorphism (backdrop-blur + translucent white cards).
No low-contrast dark mode. Meet WCAG AA (4.5:1 body text, 3:1 large text/UI) in both themes.
No "3 icon boxes in a row" feature section. Use layouts driven by real content: screenshots, varied grids, prose.
No pill badge above the headline ("✨ New: ..." chips).
Not Lucide icons everywhere. Use icons sparingly and only where they aid comprehension; consider a more distinctive set or custom marks.
No untouched shadcn/ui. If using shadcn, customize tokens (radius, colors, typography, shadows) so it reads as this product.
No fade-in-on-scroll for every section. Content is visible immediately; motion only where it communicates something. Respect prefers-reduced-motion.
No cursor-following beams/spotlights or similar gimmick effects.
Buttons don't just fade on hover. Use clear, intentional state changes (color/background shift, pressed state, visible focus ring).
Consistent spacing. Use a single spacing scale (e.g. 4/8px based tokens); no ad-hoc values.
No em dashes (—) in UI copy. Use periods, commas, or colons.
No generic buzzword copy ("seamless", "supercharge", "unlock", "revolutionize", "next-level", "effortless"). Write specific, concrete copy about what the product actually does.
No serif-italic accent words inside sans-serif headlines.
No Space Grotesk + Instrument Serif combo (the default "AI tasteful" pairing).
No grain/noise texture over gradients.
For UI reviews, also use the web-design-guidelines skill.

Security: required before launch
Every feature must satisfy these; check them before considering work done:

Hide API keys. Secrets live only in server-side env vars (.env* in .gitignore). Never ship secret keys to the client or prefix them with NEXT_PUBLIC_/VITE_.
Purge Git secrets. Never commit secrets; if one is committed, rotate it and scrub history. Keep a .env.example with placeholder values only.
Use the public DB key on the client. Client code uses only the anon/publishable key (e.g. Supabase anon key); service-role/admin keys are server-only.
Enable row-level security on every table, with explicit policies. No table is reachable without RLS.
Encrypt sensitive data at rest (PII, tokens) and in transit.
Enforce auth server-side. Never trust client-side checks or hidden UI; every protected route/API/action verifies the session on the server.
Lock record access. Every read/write checks the record belongs to (or is shared with) the current user. Prevent IDOR.
Block field tampering. Whitelist writable fields; never accept role, user_id, is_admin, price, etc. from the client. Derive them server-side.
Secure session cookies: HttpOnly, Secure, SameSite=Lax (or Strict), sensible expiry.
Hash passwords with bcrypt/argon2 (or delegate to a vetted auth provider). Never store or log plaintext.
Rate limit login, signup, password reset, and other sensitive/expensive endpoints.
Add bot protection (e.g. Cloudflare Turnstile) on public forms like signup, login, and contact.
Parameterize queries. No string-concatenated SQL; use the ORM/query builder or prepared statements.
Validate all input server-side with a schema (e.g. Zod): types, lengths, formats, enums.
Escape user content. No dangerouslySetInnerHTML/innerHTML with user data; sanitize (DOMPurify) if HTML is truly required.
Restrict file uploads: allowlist MIME types and extensions, verify content, cap size, randomize filenames, store outside the web root / in private buckets.
Trim API responses. Return only the fields the client needs; never leak password hashes, internal IDs, tokens, or other users' data. No stack traces in production errors.
Add security headers: CSP, HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, frame-ancestors/X-Frame-Options, Permissions-Policy.
Force HTTPS everywhere, with HSTS; redirect HTTP.
Scan dependencies (npm audit or equivalent) and keep them updated; pin versions via the lockfile.
For a deeper review, use the security-audit skill.