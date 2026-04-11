# Sector P/E Charts

Live, interactive S&P 500 sector valuations dashboard built with React, Node.js, and Polygon.io.

## Features

- 📊 Real-time P/E ratio visualizations
- 📈 Cap-weighted vs equal-weight comparison
- 📅 Historical data with date range picker
- ⏱️ Time-lapse animation through historical periods
- 🔄 Sector toggle filtering
- 💾 SQLite caching layer for performance

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)
- Polygon.io API

### Frontend
- React 18
- TypeScript
- Recharts (visualization)
- Vite (build tool)
- Axios (API client)

## Setup

### Prerequisites
- Node.js 18+
- Polygon.io API key

### Installation

```bash
# Clone repository
git clone <repo-url>
cd sector-charts

# Install dependencies
npm install --workspaces

# Create .env file
cp backend/.env.example backend/.env
# Edit backend/.env and add your POLYGON_API_KEY
```

### Development

```bash
# Terminal 1: Start backend
cd sector-charts/backend
npm run dev

# Terminal 2: Start frontend
cd sector-charts/frontend
npm run dev
```

Frontend will be available at `http://localhost:5173`
Backend API at `http://localhost:3000`

### Testing

```bash
# Backend tests
cd sector-charts/backend
npm test

# Frontend tests
cd sector-charts/frontend
npm test

# Seed mock data
cd sector-charts/backend
npm run seed
```

### Production Build

```bash
# Build both projects
npm run build --workspaces

# Backend runs on configured PORT (default 3000)
# Frontend assets should be served via reverse proxy or deployed to CDN
```

## API Endpoints

### GET /api/sectors
Get all sector metrics for a specific date

Query params:
- `date` (optional): YYYY-MM-DD format, defaults to today

Response:
```json
{
  "date": "2024-04-11",
  "sectors": [
    {
      "date": "2024-04-11",
      "sector": "Technology",
      "weightedPeRatio": 21.4,
      "equalWeightPeRatio": 19.6,
      "weightedMarketCap": 15000000000000,
      "constituents": 73,
      "lastUpdated": "2024-04-11T15:30:00Z"
    }
  ]
}
```

### GET /api/sectors/:sectorName
Get sector with historical comparisons

### GET /api/sectors/:sectorName/history
Get historical data for a sector

Query params:
- `days` (optional): Number of days of history, defaults to 365

## Architecture

```
┌─────────────────┐
│   React SPA     │
│  (Port 5173)    │
└────────┬────────┘
         │
         │ HTTP
         │
┌────────▼────────┐
│  Express API    │
│  (Port 3000)    │
└────────┬────────┘
         │
┌────────┴────────┬──────────────┐
│                 │              │
│            SQLite      Polygon.io API
│           (Cache)    (Live Data)
│
```

## Performance Optimization

- **Rate Limiting**: Request queue respects Polygon.io API limits
- **Caching**: 24-hour cache on sector metrics to reduce API calls
- **Database**: Indexed queries on frequently accessed columns
- **Frontend**: React lazy loading, memoized calculations

## Future Enhancements

- [ ] YTD return calculations
- [ ] 10-year and 5-year historical trend lines
- [ ] Real-time data updates via WebSocket
- [ ] Export data to CSV/JSON
- [ ] Mobile-responsive improvements
- [ ] Dark mode
