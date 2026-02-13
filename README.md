# Multi Lighthouse Analyzer

A web application that analyzes multiple websites simultaneously using Google Lighthouse, providing performance, accessibility, best practices, and SEO scores with monitoring and historical trend tracking.

## Features

### Phase 1 - Multi-Site Analysis ✅
- **Batch URL Analysis**: Analyze up to 10 URLs simultaneously
- **Score Dashboard**: Performance, Accessibility, Best Practices, SEO scores
- **Audit Details**: Full Lighthouse audit results with categorized issues
- **Device Selection**: Mobile and Desktop analysis modes
- **Results Table**: Color-coded score badges with status indicators

### Phase 2 - Monitoring & History ✅
- **Site Monitoring**: Toggle periodic analysis per site
- **Flexible Scheduling**: Every 6 hours, daily, or weekly
- **Historical Charts**: Line charts showing score trends over time
- **Delta Tracking**: Compare current scores against previous reports

### Security ✅
- **SSRF Protection**: Blocks localhost, private IPs, and internal hostnames
- **Rate Limiting**: In-memory rate limiting (5 requests/minute)
- **Input Sanitization**: URL validation and normalization
- **Concurrency Control**: Maximum 3 simultaneous Chrome instances

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Lighthouse, Chrome Launcher
- **Database**: SQLite via Prisma ORM
- **Scheduler**: node-cron for periodic monitoring
- **Testing**: Jest with ts-jest

## Getting Started

### Prerequisites
- Node.js 20+
- Chromium/Chrome browser

### Installation

```bash
npm install
```

### Database Setup

```bash
npx prisma migrate dev
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t multilighthouse .
docker run -p 3000:3000 multilighthouse
```

## API Endpoints

### POST /api/analyze
Analyze multiple URLs with Lighthouse.

```json
{
  "urls": ["https://example.com", "https://google.com"],
  "device": "mobile"
}
```

### GET /api/sites
List all analyzed sites with latest report.

### GET /api/site/:id/reports
Get historical reports for a site.

### POST /api/site/:id/monitor
Toggle monitoring for a site.

```json
{
  "enabled": true,
  "frequency": "24h"
}
```

### GET /api/report/:id
Get full report details including raw Lighthouse data.

## Testing

```bash
npm test
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # Multi-site analysis endpoint
│   │   ├── report/[id]/      # Single report details
│   │   ├── site/[id]/
│   │   │   ├── monitor/      # Monitoring toggle
│   │   │   └── reports/      # Site report history
│   │   └── sites/            # List all sites
│   ├── site/[id]/            # Site detail page
│   ├── layout.tsx
│   └── page.tsx              # Dashboard
├── components/
│   ├── HistoryChart.tsx      # Line chart for trends
│   ├── ScoreBadge.tsx        # Color-coded score badges
│   └── ScoreCircle.tsx       # Circular score gauges
└── lib/
    ├── lighthouse-runner.ts  # Lighthouse with concurrency control
    ├── monitor.ts            # Cron-based monitoring scheduler
    ├── prisma.ts             # Database client singleton
    └── url-utils.ts          # URL validation & SSRF protection
```
