# Email assets

Static assets used by transactional emails sent from `ayunis-core-backend`. All images here are publicly served from `https://app.ayunis.com/email/<filename>`.

## Files

| File | Used in | Display size |
|---|---|---|
| `logo.png` | All emails (header) | 130px wide |
| `banner-welcome.png` | Invitation, Konto-aktivieren | 496px wide |
| `team.png` | All emails (signoff) | 126px wide |

PNG is used everywhere because Outlook Desktop (Word renderer) cannot render SVG.

## Why these files live here

Email images need stable, publicly-reachable URLs. Inlining as base64 data URIs (which we did during the design phase) blows up email size, gets stripped by some clients, and is cached poorly. Hosting them on the same domain as the app is the standard pattern.

## Updating

When swapping a banner, keep the same filename so the email templates don't need to change. Images are served by Nginx (production) / Vite (dev) directly from `public/`.
