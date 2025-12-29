# Non-Boring AI News Curator 🧠

A personal AI news aggregator that runs automatically via GitHub Actions (or locally).

## Features
- **Auto-Scraper**: Fetches latest AI news from FutureTools.io.
- **Deduplication**: Smart filtering to remove duplicate headlines.
- **Premium UI**: Dark mode, glassmorphism design.
- **Automated**: Runs every day at 17:00 UTC via GitHub Actions.

## How to Deploy
1. This repo is already set up with `.github/workflows/daily_update.yml`.
2. Enable **GitHub Pages** in your repository settings (Source: `main` branch).
3. The site will be live and auto-updating.

## Local Usage
- Run `node updater.js` to fetch news manually.
- Open `index.html` to view.
