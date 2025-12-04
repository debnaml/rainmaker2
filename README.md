# Rainmaker 2

Rainmaker is a Next.js 16 application backed by Supabase. Admins can manage peer groups, users, and lesson data, while learners track progress, join discussions, and compare standings via the leaderboard. This document captures the current project setup, environment expectations, and integration notes for Birketts’ Kallidus Learn platform.

## Prerequisites

- Node.js 20.x (matches Vercel runtime)
- npm 10.x (shipped with Node 20)
- Supabase project with the expected tables (`users`, `peer_groups`, `lessons`, `lesson_progress`, `comments`, etc.)
- Optional: Azure AD application registration for SSO
- Optional: Kallidus Learn API access (client credentials or subscription key depending on tenant configuration)

## Environment Variables

Create `.env.local` using the following keys:

```env
SUPABASE_URL=...
SUPABASE_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# NextAuth session handling
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-deployed-domain

# Azure AD SSO (set only when enabling SSO)
NEXT_PUBLIC_AZURE_AD_SSO_ENABLED=false
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
```

Set `NEXT_PUBLIC_AZURE_AD_SSO_ENABLED=true` only after all Azure values are present. The service-role key must be treated as confidential; restrict its use to server-side handlers.

### Kallidus Learn Integration Inputs

To query Learn on behalf of Birketts users you will need:

- Learn tenant base URL (for Birketts: `https://birketts.kallidus-suite.com`)
- Either:
  - OAuth `clientId` and `clientSecret` (for tenant-scoped endpoints such as `/identity/connect/token` and `/api2/v1/...`), **or**
  - An `Ocp-Apim-Subscription-Key` if your tenant has been moved to the Azure API Management gateway (`https://gateway.kallidusapi.com/...`). Some deployments require both—confirm with Kallidus support which model applies.
- Scope string `https://www.kallidus.com/learn` when requesting a bearer token via client credentials.
- Learner identifiers already stored in Rainmaker (email addresses or usernames) to resolve each user’s `internalUserId` (`suiteId`).

Store the resulting `suiteId` on the Rainmaker user record. It is required for calls such as `GET /api2/v1/people/{suiteId}/courses` to retrieve course and lesson progress. Maintain a mapping between Rainmaker lessons and their Kallidus `CourseId` / `LessonId` so you can filter the API response locally.

## Installing Dependencies

Clone the repository and install packages:

```bash
npm install
```

## Development Workflow

- Start the dev server: `npm run dev`
- Run lint checks: `npm run lint`
- Tests are currently manual; run through the dashboard, admin tools, and lesson pages after major changes.

## Key Features

- **Dashboard**: Displays overall completion, peer leaderboard placement, and live event stats.
- **Leaderboard**: Aggregates peer-group progress, normalizing by role and lesson eligibility.
- **Peer Groups Admin**: CRUD management for peer groups and peer-group membership.
- **Users Admin**: Assign roles and peer groups inline.
- **Lesson Discussions**: Learners can post and delete comments ordered by newest first.
- **Lesson Progress Tracking**: Tracks progress via Supabase `lesson_progress`; enhanced lessons are hidden from standard roles.

## API Routes (App Router)

- `GET /api/leaderboard` – peer-group standings for the signed-in user.
- `GET/POST /api/lessons/[lessonId]/comments` – retrieve or create lesson comments.
- `DELETE /api/lessons/[lessonId]/comments` – delete a comment if owned by the requester.
- `PUT /api/lessons/[lessonId]/progress` – update lesson progress.
- `POST/DELETE /api/lessons/[lessonId]/favourite` – toggle favourites.
- Admin routes under `/api/admin/...` handle peer groups, users, lessons, modules, and resources.

All API handlers run server-side and rely on the Supabase service-role client. Protect the service key and avoid exposing these endpoints to unauthenticated users.

## Adding Kallidus Progress Sync (Conceptual)

1. **Resolve suiteId**: On login (or scheduled sync), call `GET /api2/v1/users?emailAddress=user@example.com` with the bearer token or subscription key; persist `internalUserId`.
2. **Fetch course data**: Call `GET /api2/v1/people/{suiteId}/courses` (optionally with `$filter` to restrict to Rainmaker-managed courses). Cache responses to respect the 100-requests-per-minute guideline.
3. **Filter lessons**: Match returned `Lessons[].LessonId` against the Rainmaker lesson mapping. Treat `CurrentTrainingResult.Status` values of `Attended`, `Complete`, `Passed`, or `Exempt` as completion.
4. **Persist progress**: Update the local `lesson_progress` table to mirror Learn results, and surface completion dates via the `LastUpdated` field.
5. **Deep links**: Use `CourseDeepLinkUrl` to send learners back to Learn when needed.

No Kallidus requests are currently issued from the app; the above outline is provided to guide future development.

## Deployment Notes

- Production deploys target Vercel; ensure the `.env` values are mirrored in project/environment settings.
- After each deploy, verify the dashboard leaderboard, admin tools, and lesson discussion workflow in the live environment.

## Troubleshooting

- **Supabase errors**: Verify `.env.local` values and that the service role key is valid.
- **Azure SSO issues**: Confirm redirect URI matches `NEXTAUTH_URL` and that certificates/secret are up to date.
- **Leaderboard gaps**: Users without peer groups will see a disabled leaderboard card; assign a peer group via the admin interface.
- **Comment permissions**: Users may delete only their own comments; others see no delete control.

For questions or access to integration credentials reach out to the Rainmaker maintainers or Birketts support team.

## TODO

- Revisit footer resource columns once new marketing content is available.
