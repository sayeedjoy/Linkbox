# LinkBox

Simple, fast, and minimal bookmark manager.

## Features

- **Add bookmarks** – Paste a URL, drag and drop, or type. Metadata (title, description, favicon, preview image) is fetched automatically.
- **Groups** – Organize bookmarks in groups with custom names and colors. Reorder groups via drag and drop.
- **Search** – Quick search across your bookmarks (⌘F).
- **Keyboard shortcuts** – `j`/`k` or arrows to navigate, `Enter` to open, `e` to edit, `Backspace`/`Delete` to remove, `?` for help.
- **Theme** – Light, dark, or system preference.
- **Export** – Download all bookmarks as JSON.
- **API tokens** – Create tokens for programmatic access (extension, scripts).
- **Account** – Sign up, sign in, password reset, delete account.

## Tech Stack

- [Next.js](https://nextjs.org) 16
- [React](https://react.dev) 19
- [Prisma](https://prisma.io) + PostgreSQL
- [NextAuth](https://next-auth.js.org) (credentials)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn](https://ui.shadcn.com)
- [unfurl.js](https://github.com/ndaidong/unfurl) for link metadata

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the example env file and set variables:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL` – PostgreSQL connection string
- `AUTH_SECRET` – Secret for NextAuth (e.g. `openssl rand -base64 32`)

Optional:

- `OPENAI_API_KEY` – For AI-related features (if any)
- `RESEND_API_KEY` – For password reset emails
- `NEXT_PUBLIC_APP_URL` – Base URL (default: `http://localhost:3000`)

3. Run migrations:

```bash
npx prisma migrate dev
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/               # Next.js app router
├── actions/       # Server actions (bookmarks, groups, auth, api-tokens)
├── api/           # API routes (auth, export)
├── sign-in/       # Auth pages
├── sign-up/
├── forgot-password/
├── reset-password/
components/        # React components
├── bookmark-app/  # Main app shell, preview, shortcuts
├── bookmark-list/ # List, row, edit card, sort
├── group-dropdown/# Group selector, create/edit/delete/reorder
lib/               # Shared utilities (auth, parse, metadata)
prisma/            # Schema and migrations
```

## License

Private.
