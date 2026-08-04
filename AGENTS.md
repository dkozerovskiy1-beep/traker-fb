<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 Instructions for AI Coding Agents

Welcome to **VartaFlow** (AskMyProfit FB Tracker)!

Before making any modifications or investigating issues, **ALWAYS read [PROJECT_OVERVIEW.md](file:///Users/dkozerovskiy/Documents/ФАЙЛИ/Бізнес/Проекти/AskMyProffit/Трекер%20ФБ/PROJECT_OVERVIEW.md)** for a full architectural guide, database schema explanation, and deployment rules.

### Key Mandatory Rules for Agents:
1. **Never set `status: "DISABLED"` on transient API errors**: Ad account status in the DB MUST ONLY be updated based on Meta's official `account_status` integer (1 = ACTIVE, 2/100/101 = DISABLED). Catch blocks for metric syncing must NEVER mark accounts as disabled.
2. **Prisma Schema Changes**: Run `npx prisma generate` after editing `prisma/schema.prisma`.
3. **Deployment Safety**: All code pushed to `main` branch automatically deploys to Vercel. Always run `npx tsc --noEmit` before committing code to ensure zero build errors.
