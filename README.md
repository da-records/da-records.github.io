# DA Travel Order Records

Public travel order register and verified-email admin portal. Built with Next.js, Firebase Authentication, and Cloud Firestore; exported as a static site for `da-records.github.io` and published through GitHub Actions.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The Firebase web configuration supplied for project `records-f9ca9` is in `lib/firebase.ts`; `NEXT_PUBLIC_FIREBASE_*` environment variables can override those defaults. Firebase web API keys are public identifiers, not authorization controls.

## Firebase setup

1. Enable Email/Password under Firebase Authentication providers and add `localhost` and `da-records.github.io` to Authorized domains.
2. Create the Cloud Firestore database for project `records-f9ca9`.
3. Publish the rules in `firestore.rules` using the Firebase console or `firebase deploy --only firestore:rules`.
4. Create an account at `/admin/`, verify the email from the message, then sign in. Verified accounts can manage records; the public register is read-only.

Individual entries create one travel order. Group entries share a destination and travel dates but create one Firestore record and one travel number per person-office row. New groups require at least two people and are saved atomically.

The latest existing travel number for November 2026 is `1126-0713`; the next new record receives `1126-0714`. Numbers use `MMYY-####` and are allocated in a Firestore transaction, with a separate counter for each month.

## GitHub Pages

The workflow at `.github/workflows/deploy.yml` builds the static `out/` directory and publishes it to GitHub Pages on pushes to `main`. In repository settings, choose **Settings → Pages → Build and deployment → GitHub Actions**. The project is configured for the organization site URL `https://da-records.github.io/`, so it does not need a repository subpath or `basePath`.

The static export has no Next.js server routes: Firebase provides runtime authentication and data. Create the Firebase project resources and publish the Firestore rules before deploying the site.
