This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### TODO:

- finish connecting website
  With this app running via npm run dev, the website should call:

List of posts: http://localhost:3000/api/blog (you can add ?limit=10&offset=0&type=Career)
One post: http://localhost:3000/api/blog/{guid}
Two things to watch when both run locally:

Ports: if your website is also a Next.js (or similar) app, it will try to use port 3000 too. Start one of them on a different port, for example this app with npm run dev -- -p 3001. Then the URL becomes http://localhost:3001/api/blog.

CORS: this matters only if the website calls the API from browser code (fetch in a client component or plain JS). Add the website's exact origin to this app's .env, then restart the dev server:

PUBLIC_API_ALLOWED_ORIGINS=http://localhost:5173
Use whatever port your website actually runs on. It must match exactly, including http:// and the port. If the website fetches server-side, you can skip this.

Put the base URL in the website's env (e.g. GEEKPOWER_API_URL=http://localhost:3000) so you only change it once for production.
