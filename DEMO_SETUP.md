# Demo Setup Guide — Cliniqly / Chikitsa360

Everything you need to go from code to a live demo URL. Every service is **free**.

---

## Prerequisites

- Node.js v22+ and pnpm v11.5+ installed
- Git repo pushed to GitHub (already done)
- A phone number for testing WhatsApp

**Estimated total time: 1.5–2 hours** (mostly waiting for Meta approval)

---

## Services to sign up for

| Service | What it does | Free limit |
|---|---|---|
| [Vercel](https://vercel.com) | Hosts the Next.js app | Unlimited deploys |
| [Neon](https://neon.tech) | PostgreSQL database | 0.5 GB, no sleep |
| [Upstash](https://upstash.com) | Redis (WhatsApp conversation state) | 10,000 commands/day |
| [Inngest](https://inngest.com) | Background jobs (reminders, notifications) | 50,000 runs/month |
| [Pusher](https://pusher.com) | Real-time calendar updates | 200K messages/day |
| [Meta for Developers](https://developers.facebook.com) | WhatsApp Cloud API | 1,000 conversations/month free |
| VAPID keys (self-generated) | Web push notifications for staff | Free — no external service |

---

## Step 1 — Neon (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) → **Sign up free**
2. Create a new project → name it `cliniqly-demo`
3. Choose region **Asia Pacific (Singapore)** for lowest latency from India
4. Once created, go to **Connection Details** — you need **two** connection strings:

**Pooled connection** (toggle "Pooled connection" ON) — used by the app at runtime:
```
postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
This is your `DATABASE_URL`.

> **Note:** Neon updated their connection string format — use `channel_binding=require` not `pgbouncer=true`.

**Direct connection** (toggle "Pooled connection" OFF) — used by Prisma migrations:
```
postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```
This is your `DATABASE_URL_UNPOOLED`.

Save both — you'll need them in Step 7.

---

## Step 2 — Upstash (Redis)

1. Go to [upstash.com](https://upstash.com) → **Sign up free**
2. Click **Create Database** → name it `cliniqly-redis`
3. Region: **Singapore (ap-southeast-1)**
4. Type: **Regional** (not Global — cheaper and enough for demo)
5. Once created, go to **REST API** tab → copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Step 3 — Pusher (Real-time)

1. Go to [pusher.com](https://pusher.com) → **Sign up free**
2. Create a new app → name it `cliniqly-demo`
3. Cluster: **ap2 (Mumbai)** — closest to India
4. Go to **App Keys** tab → copy all four values:
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER` (will be `ap2`)
5. `NEXT_PUBLIC_PUSHER_KEY` = same as `PUSHER_KEY`
6. `NEXT_PUBLIC_PUSHER_CLUSTER` = same as `PUSHER_CLUSTER`

---

## Step 4 — Inngest (Background jobs)

1. Go to [inngest.com](https://inngest.com) → **Sign up free**
2. Create a new app → name it `cliniqly`
3. Go to **Manage → Keys** → copy:
   - `INNGEST_EVENT_KEY` (under "Event Keys")
   - `INNGEST_SIGNING_KEY` (under "Signing Keys")

> The app registers itself at `/api/inngest` automatically on first deploy.

---

## Step 5 — Meta WhatsApp (Cloud API)

This is the most involved step but the test sandbox works immediately without business verification.

### 5a — Create a Meta Developer account

1. Go to [developers.facebook.com](https://developers.facebook.com) → **Get Started**
2. Sign in with any Facebook/Meta account
3. Complete the developer registration form

### 5b — Create an app

1. Click **My Apps** → **Create App**
2. App type: **Business**
3. App name: `Cliniqly Demo`
4. Once created, click **Add Products** → find **WhatsApp** → click **Set up**

### 5c — Get your test credentials

1. In the left sidebar, go to **WhatsApp → API Setup**
2. You will see a **test phone number** that Meta provides (format: +1 555 xxxxxxx)
3. Copy the **Access Token** (permanent — valid indefinitely for sandbox)
4. Copy the **Phone Number ID** (a long numeric ID under the test number)
5. Under **To**, click **Add phone number** → add your own WhatsApp number as a test recipient

> You can add up to 5 test recipient numbers. This is all you need for demo.

### 5d — Set up the webhook

After deploying to Vercel (Step 6), come back here to register the webhook:

1. In **WhatsApp → Configuration**, find the **Webhook** section
2. Set **Callback URL** to: `https://your-vercel-url.vercel.app/api/webhooks/whatsapp`
3. Set **Verify Token** to any random string — e.g. `cliniqly-demo-2026` (you'll use this as `WHATSAPP_VERIFY_TOKEN`)
4. Click **Verify and Save**
5. Subscribe to the **messages** field

### 5e — Copy these values

| Env var | Where to find it |
|---|---|
| `META_SYSTEM_ACCESS_TOKEN` | WhatsApp → API Setup → Access Token |
| `META_APP_SECRET` | App Settings → Basic → App Secret |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | App Settings → Basic → App ID |
| `WHATSAPP_VERIFY_TOKEN` | The string you chose in Step 5d |

> The `phoneNumberId` for the test number is stored per-clinic in the database (set during onboarding), not as an env var.

---

## Step 6 — Vercel (Deploy)

1. Go to [vercel.com](https://vercel.com) → **Sign up with GitHub**
2. Click **New Project** → import the `Chikitsa360` repository
3. Vercel auto-detects Next.js — no build settings to change
4. Set **Root Directory** to `apps/web`
5. **Do not deploy yet** — add env vars first (Step 7)

---

## Step 7 — Add all environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add each of these.
Set each one for **Production**, **Preview**, and **Development**.

```bash
# ─── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app
NEXT_PUBLIC_CLIENT_ID=cliniqly

# ─── Auth ──────────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
AUTH_SECRET=<random 32-char string>
# Must match your Vercel URL exactly (no trailing slash)
AUTH_URL=https://your-project-name.vercel.app

# ─── Demo login (bypass OTP — required when no WhatsApp/SMS provider) ──────
# Set to any 6-digit code. Use this code to log in on the login screen.
# Remove this var when going live with a real OTP provider.
DEV_OTP_BYPASS=123456

# ─── Database ──────────────────────────────────────────────────────────────
# Pooled — used by the app at runtime (PgBouncer URL from Neon)
DATABASE_URL=<pooled URL from Neon Step 1>
# Direct — used by Prisma migrations (non-pooler URL from Neon)
DATABASE_URL_UNPOOLED=<direct URL from Neon Step 1>

# ─── Redis ─────────────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=<paste from Upstash Step 2>
UPSTASH_REDIS_REST_TOKEN=<paste from Upstash Step 2>

# ─── Pusher (Real-time) ────────────────────────────────────────────────────
PUSHER_APP_ID=<paste from Pusher Step 3>
PUSHER_KEY=<paste from Pusher Step 3>
PUSHER_SECRET=<paste from Pusher Step 3>
PUSHER_CLUSTER=ap2
NEXT_PUBLIC_PUSHER_KEY=<same as PUSHER_KEY>
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# ─── Inngest ───────────────────────────────────────────────────────────────
INNGEST_EVENT_KEY=<paste from Inngest Step 4>
INNGEST_SIGNING_KEY=<paste from Inngest Step 4>

# ─── WhatsApp (Meta Cloud API) ─────────────────────────────────────────────
META_SYSTEM_ACCESS_TOKEN=<paste from Meta Step 5>
META_APP_SECRET=<paste from Meta Step 5>
NEXT_PUBLIC_FACEBOOK_APP_ID=<paste from Meta Step 5>
WHATSAPP_VERIFY_TOKEN=<the string you chose in Step 5d>

# ─── Web Push Notifications (staff alerts for new bookings) ────────────────
# Generate once: npx web-push generate-vapid-keys
# VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are server-only (never exposed to browser)
# NEXT_PUBLIC_VAPID_PUBLIC_KEY must equal VAPID_PUBLIC_KEY (it's safe to expose)
VAPID_PUBLIC_KEY=<output of generate-vapid-keys — "Public Key" line>
VAPID_PRIVATE_KEY=<output of generate-vapid-keys — "Private Key" line>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY>
VAPID_EMAIL=mailto:support@cliniqly.com

# ─── SMS Fallback (optional — skip for demo) ───────────────────────────────
# MSG91_AUTH_KEY=
# MSG91_SENDER_ID=
# MSG91_TEMPLATE_ID=
```

> **Tip:** After adding vars, click **Save** then go back to your project and deploy.

---

## Step 8 — Deploy

1. In Vercel, click **Deploy**
2. Wait ~2 minutes for the build to complete
3. Once live, copy your URL: `https://your-project-name.vercel.app`

---

## Step 9 — Run database migrations

After first deploy, run the migration to create all tables:

```bash
# In your local terminal, with DATABASE_URL set to the Neon connection string:
cd apps/web
DATABASE_URL="<your neon url>" pnpm db:migrate
```

Or add `DATABASE_URL` to your local `apps/web/.env.local` and run:

```bash
pnpm --filter @chikitsa360/web db:migrate
```

This creates all the PostgreSQL tables including tenant schemas.

---

## Step 10 — Register Inngest functions

After deploy, Vercel needs to sync your background job functions with Inngest:

1. Go to your Inngest dashboard → **Apps**
2. Click **Sync App** → enter your URL: `https://your-project-name.vercel.app/api/inngest`
3. Inngest discovers all 7 functions automatically

---

## Step 11 — Complete the WhatsApp webhook (Step 5d)

Now that your app is deployed:

1. Go back to Meta → **WhatsApp → Configuration → Webhook**
2. Enter: `https://your-project-name.vercel.app/api/webhooks/whatsapp`
3. Verify token: the string you chose (`cliniqly-demo-2026`)
4. Click **Verify and Save** — Meta sends a test request and your app responds ✓
5. Subscribe to **messages**

---

## Step 12 — Test the full flow

### Create the demo clinic

1. Open `https://your-project-name.vercel.app`
2. Log in → complete the 4-step onboarding wizard
3. Enter the WhatsApp **Phone Number ID** from Meta (Step 5c) when prompted
4. Set working hours and add a doctor

### Test WhatsApp booking

From the phone number you added as a test recipient in Step 5c:

1. Send **"Hi"** to the Meta test phone number
2. You should receive a Quick Reply message asking for consent
3. Follow the flow → book a slot
4. Check the clinic calendar — appointment appears in real-time

### Test receptionist booking

1. Log in as receptionist
2. Go to Appointments → New Appointment
3. Search for patient, pick slot, save
4. Patient receives WhatsApp confirmation

---

## Troubleshooting

**WhatsApp messages not sending**
- Check `META_SYSTEM_ACCESS_TOKEN` is correctly pasted (no extra spaces)
- Verify the recipient number is added as a test number in Meta dashboard
- Check Vercel function logs for `META_SYSTEM_ACCESS_TOKEN not set` error

**Database connection error**
- Neon free tier requires `?sslmode=require` at the end of the DATABASE_URL
- Run `pnpm db:migrate` to create tables if you get "relation does not exist"

**Real-time calendar not updating**
- Verify `PUSHER_CLUSTER=ap2` matches the cluster you selected in Step 3
- Check browser console for Pusher connection errors

**Inngest jobs not running**
- Re-sync the app in Inngest dashboard after every new deploy
- Check the Inngest dashboard → Functions to see if they're registered

**Webhook verification failing**
- Make sure `WHATSAPP_VERIFY_TOKEN` in Vercel matches exactly what you entered in Meta

---

## What you get from this stack for free

| Limit | Enough for |
|---|---|
| Neon 0.5 GB | ~50,000 appointments + patient records |
| Upstash 10K commands/day | ~1,000 WhatsApp conversations/day |
| Inngest 50K runs/month | ~10,000 appointments/month |
| Pusher 200K messages/day | Hundreds of concurrent users |
| Meta 1,000 free conversations/month | A small clinic for 2–3 months |

When you sign your first paying client, upgrade Neon ($19/month) and you're set for growth.

---

## Switching to a real clinic's WhatsApp number

Once you're ready to go live with a real clinic (not just the test sandbox):

1. The clinic owner creates a **Meta Business account** and verifies their business
2. They add their real WhatsApp Business phone number in Meta Business Manager
3. Submit the message templates for approval (~3–5 business days)
4. During clinic onboarding in the app, they enter their real Phone Number ID and access token
5. The same webhook URL continues to work — no code changes needed

---

*Generated 2026-06-09 · Cliniqly / Chikitsa360 monorepo*
