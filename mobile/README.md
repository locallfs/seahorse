# ReefNerds — Woody's Seahorse staff app

iOS + Android app for Woody's Seahorse employees to manage products from their phones. Talks directly to the Medusa admin API on Railway.

## What it does

- Sign in with Medusa admin credentials
- Browse, search, and edit products
- Add new products with photos from camera or gallery
- Manage inventory (stepper + direct entry, low-stock badges)
- Publish / unpublish products (controls visibility on the website)
- Delete products
- **Admin only:** invite new employees by email, remove employees

## First-time setup (on your laptop)

1. **Install Node.js** (v20+) and **npm** if you don't have them.
2. Open a terminal and go into this folder:
   ```bash
   cd mobile
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   - `EXPO_PUBLIC_MEDUSA_BACKEND_URL` — your Railway URL (default is already set)
   - `EXPO_PUBLIC_ADMIN_EMAIL` — the email of the **owner** account (gets the admin role in the app; everyone else is treated as an employee)

## Run in development

```bash
npm run start
```

This opens the Expo Dev Tools. To try it on your phone:

- Install **Expo Go** from the App Store / Play Store
- Scan the QR code from the terminal
- The app loads on your phone — edit files on your laptop, see changes instantly

## Ship to the App Store / Play Store

This requires an Expo account (free) and developer accounts with Apple ($99/yr) and Google ($25 one-time).

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Then build for production:

```bash
# iOS (submits to App Store Connect)
eas build --platform ios
eas submit --platform ios

# Android (submits to Play Store)
eas build --platform android
eas submit --platform android
```

EAS runs the build in the cloud — you don't need a Mac for iOS builds.

## Project structure

```
mobile/
├── app/                       Expo Router routes
│   ├── _layout.tsx            Auth gate (redirects to login if signed out)
│   ├── login.tsx              Login screen
│   └── (app)/                 Authenticated area
│       ├── _layout.tsx        Bottom tabs
│       ├── index.tsx          Product list
│       ├── new.tsx            New product
│       ├── product/[id].tsx   Edit / delete product
│       └── team.tsx           Team (admin only)
├── lib/
│   ├── medusa.ts              SDK client + SecureStore token storage
│   ├── auth.tsx               Auth context, login/logout, role detection
│   ├── products.ts            Product list / create helpers
│   └── theme.ts               Dark theme colors + spacing
└── app.json                   Expo config (name, icon, permissions)
```

## Tech

- Expo SDK 54 + Expo Router 6
- React Native 0.81, React 19
- `@medusajs/js-sdk` (same API the web admin uses)
- `expo-secure-store` for the JWT
- `expo-image-picker` for photos
- TypeScript strict mode

## Troubleshooting

- **Login fails with "Unauthorized":** The email/password must be an existing Medusa admin user. Create one in the Medusa admin panel first.
- **Team tab missing:** You're signed in as an employee. Only the email matching `EXPO_PUBLIC_ADMIN_EMAIL` sees the Team tab.
- **New product has 0 stock after creation:** Medusa needs at least one Stock Location set up. Create one in the Medusa admin under Settings → Locations.
- **Image upload fails:** The Medusa backend uses Bunny.net — confirm `BUNNY_*` vars are set on Railway.
