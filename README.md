# opensop-website

OpenSOP.ai marketing site — open runtime for business processes.

## Build

```sh
npm install && npm run build
```

This pre-compiles `src/editorial.jsx` via Babel into `assets/editorial.js`. Commit the compiled output; it is what GitHub Pages serves.

## Deploy

Served by GitHub Pages from the `main` branch, `/` (root) path. Custom domain: `opensop.ai`.

The `CNAME` file in the repo root tells GitHub Pages to serve the site at `opensop.ai`. Enable Pages in the repo settings: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**.

## DNS records (already configured? confirm)

Configure the following records at your DNS provider:

| Type  | Name              | Value                  |
|-------|-------------------|------------------------|
| A     | opensop.ai        | 185.199.108.153        |
| A     | opensop.ai        | 185.199.109.153        |
| A     | opensop.ai        | 185.199.110.153        |
| A     | opensop.ai        | 185.199.111.153        |
| CNAME | www.opensop.ai    | coba-ai.github.io      |

Reference: [GitHub Pages — managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
