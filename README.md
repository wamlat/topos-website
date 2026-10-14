# toposlab.com

The Topos visual site: a scroll-driven eye film with handwritten category theory,
topology, and geometry exposed as photographic traces. It is a static GitHub Pages
site with no build step.

- `index.html` / `style.css` / `main.js` — page structure, film, and scroll sequence
- `field.js` — the responsive swarm field; nearby fragments influence one another
- `assets/world/` — the desktop and mobile eye film
- `assets/manuscripts/` — the four photographed notation plates
- `assets/angels/` — lossless WebP fragments and the soft background tissue
- `assets/swarm/` — four short moving textures within the field
- `.github/workflows/deploy.yml` — deploys to GitHub Pages on every push to `main`
- `CNAME` — custom domain (`toposlab.com`)

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
