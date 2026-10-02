# Learning Tracker — Quick Start

## Development
Install dependencies:
```bash
npm install
```

Start the application:
```bash
npm start
```
The development server runs at:
http://localhost:3000

## Production Build
```bash
npm run build
```
The production output is generated in:
`build/`

## Testing
```bash
npm test -- --watchAll=false
```

## Architecture
The current application is client-side.
Application state is persisted in browser localStorage.
There is no required backend server for normal application operation.

## Persistence Architecture
Persistence: Browser localStorage
Advantages:
- Offline
- Simple
- No account required
- Instant local state
Limitations:
- Device/browser specific
- Clearing browser data can remove state
- No automatic cross-device sync
- Finite browser storage quota
Backup: Use application export/import before clearing browser data.
