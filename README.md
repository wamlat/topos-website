# toposlab.com

Landing page for Topos Labs, styled as a math preprint. Static site — no build step.

- `index.html` / `style.css` / `main.js` — the whole site
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
