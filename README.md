# Udasinagri

Single-window dashboard of worldwide agri commodity prices: edible oils, spices, cotton & guar, grains & pulses, and global softs.
Covers NCDEX, MCX, Bursa Malaysia, Euronext, CBOT and ICE.

**Live page:** https://jbtechfin.github.io/udasinagri/

- `index.html`: the static page. It fetches the latest snapshot from the `data` branch (`prices.json`) every 45 s.
- `prices.json` on `main`: a fallback snapshot only (may be stale).
- The `data` branch is refreshed automatically every ~2 minutes as a single commit.

Live indicative prices from public sources; some feeds delayed. **Not for trading.**
