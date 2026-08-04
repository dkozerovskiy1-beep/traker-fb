# 🚀 VartaFlow — AskMyProfit Facebook Ads Tracker

VartaFlow is a full-featured Facebook Ads analytics tracker, automated comment moderator, campaign automation engine, and Telegram notification alert system.

## 📖 Project Documentation

For a comprehensive guide on architecture, database schema, background cron synchronization, API endpoints, deployment setup, and agent instructions, please refer to:

👉 **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)**

---

## 🛠️ Stack & Infrastructure

- **Framework**: Next.js (App Router, TypeScript)
- **Database**: PostgreSQL (Supabase) via Prisma ORM
- **Deployment**: Vercel (Auto-deploy on `git push origin main`)
- **Background Cron**: Vercel Crons (`/api/cron/sync`)
- **Integrations**: Meta Graph API `v20.0`, Telegram Bot API

---

## 🚀 Quick Start & Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Check TypeScript types
npx tsc --noEmit

# Generate Prisma Client
npx prisma generate
```
