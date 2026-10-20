# toposlab.com

The static version of [toposlab.bio](https://toposlab.bio/), with the same branding,
copy, layout, and cursor-reactive swarm. Plain HTML, CSS, and canvas JavaScript;
no framework, package installation, or build step.

Contact opens a direct email link. There is no backend, API, sign-in, upload page,
or dataset browser.

- `index.html` / `style.css` — landing page and shared layout
- `main.js` — swarm animation, cursor interaction, and reduced-motion support
- `brand/` / `fonts/` — self-hosted logos, fallback swarm drawing, and fonts
- `contact/index.html` — static contact page
- `404.html` — missing-page response
- `.github/workflows/deploy.yml` — checks JavaScript syntax, stages only public files,
  and deploys to GitHub Pages on every push to `main`
- `CNAME` — custom domain (`toposlab.com`)

To preview locally, run `python3 -m http.server 5191` from this directory and open
`http://localhost:5191/`.

## DNS (Namecheap)

For the apex domain, add these records in Namecheap → Domain List → toposlab.com → Advanced DNS:

| Type  | Host | Value                 |
|-------|------|-----------------------|
| A     | @    | 185.199.108.153       |
| A     | @    | 185.199.109.153       |
| A     | @    | 185.199.110.153       |
| A     | @    | 185.199.111.153       |
| CNAME | www  | wamlat.github.io.     |

Then in GitHub → Settings → Pages, set the custom domain to `toposlab.com` and enable **Enforce HTTPS** once the certificate is issued.
