# GWD Team Rating Platform

Production-grade Team Rating Platform for live events such as hackathons, pitch rounds, tournaments, college competitions, and team showcases.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and the signature **GWD Red DyeWhorl** WebGL fluid simulation.

---

## Key Features & Business Rules (Authoritative Source of Truth)

1. **Dynamic Team Count ($N$)**:
   - The platform never assumes or hard-codes any fixed team count (such as 30).
   - If there are $N$ approved active teams, each participating team rates **$N - 1$ other teams**.
   - The logged-in team is **always excluded** from its own voting list (self-rating is impossible).
   - All progress bars, validation logic, completion metrics, and leaderboard calculations dynamically adapt to the actual active roster.

2. **The 5-Tens Rule**:
   - Ratings are whole numbers from **1 to 10**.
   - A team may award a rating of 10 to a maximum of **five (5) other teams** (or configurable `max_tens`, capped at $N - 1$).
   - The five 10s are **optional, not mandatory**.
   - As soon as five 10s have been assigned, the 10 button disables across all other teams with clear explanations. Changing an existing 10 to another score immediately frees up a 10 slot.

3. **Autosave Drafts & Offline Resilience**:
   - Draft ratings are continuously autosaved to the server and synchronized with `localStorage`.
   - Page refreshes, network drops, or accidental tab closures never cause participants to lose their work.
   - Draft ratings **never** affect the leaderboard until officially submitted.

4. **15-Step Atomic Submission Pipeline**:
   - Submission requires rating **100% of all eligible target teams**.
   - Includes a **Review Screen** summarizing assigned ratings by tier before confirmation.
   - Once submitted, the vote is **atomically committed and locked** (`submitted_at`).
   - Double-clicks or concurrent submissions are idempotently rejected (`ALREADY_SUBMITTED`).
   - Manipulated client requests (e.g., self-rating, extra 10s, non-integers, wrong IDs) are rejected on the server.

5. **Live & Final Leaderboards**:
   - Primary score is the **average of all final ratings received** from submitted teams (formatted to 2 decimal places).
   - Shows live submission progress: *"X of N teams submitted (Y%)"*.
   - **Tie-Breaking Order**:
     1. Higher count of 10 ratings received.
     2. Higher count of 9 ratings received.
     3. Shared rank (dense ranking).
   - Real-time updates via 5-second polling with fallback.
   - **Projector / Stage View**: High-contrast, large-typography presentation mode for big screens.
   - **Visibility Toggle**: Organizers can hide the leaderboard during voting and reveal it on stage.

6. **Organizer Command Center (`/admin`)**:
   - **Phase Control**: `DRAFT` → `REGISTRATION` → `OPEN` → `CLOSED`.
   - **Roster Freeze**: Locks the approved roster ($N$) before voting opens.
   - **Submission Monitor**: Real-time stats on completed, pending, and remaining submissions.
   - **Team Management**: Add teams manually, batch CSV import, approve/reject pending registrations, regenerate credentials, unlock submissions, disqualify/withdraw teams.
   - **CSV Export**: Instant download of the **Final Leaderboard** and the full **$N \times N$ Rating Matrix**.
   - **Audit Log**: Chronological audit trail of logins, submissions, unlocks, and administrative actions.
   - **1-Click Demo Reset**: Instantly restore test data for rehearsals.

7. **Visual Identity & DyeWhorl**:
   - Fluid Navier-Stokes WebGL2 simulation swirling rich red and maroon ink (`#ff2e3f`, `#a3121f`, `#4a0a14`) across near-black water (`#0b0507`).
   - Uses passive tracking (`globalTracking`) so user input and voting controls remain responsive.
   - Paused frame on mobile rating page to save battery.
   - Built-in fallback to CSS crimson gradients if WebGL2 is unavailable or reduced-motion is preferred.

---

## Architecture & Folder Structure

```
├── app/
│   ├── admin/page.tsx             # Organizer command center
│   ├── api/
│   │   ├── admin/                 # Admin routes (status, freeze, export, audit, teams)
│   │   ├── auth/                  # Login, logout, me session management
│   │   ├── leaderboard/route.ts   # Ranked leaderboard with tie-breaking
│   │   ├── ratings/               # Draft autosave and atomic submission
│   │   └── teams/                 # Registration and target team queries
│   ├── leaderboard/page.tsx       # Public & Projector leaderboard view
│   ├── login/page.tsx             # Team & Admin login with DyeWhorl
│   ├── rate/page.tsx              # Team rating page with 10s rule & sticky footer
│   ├── register/page.tsx          # Team self-registration page
│   ├── globals.css                # GWD red palette & theme variables
│   └── layout.tsx                 # Root layout & typography
├── components/
│   ├── ui/dye-whorl.tsx           # Navier-Stokes WebGL fluid simulation
│   ├── DyeBackground.tsx          # Wrapper with fallback & accessibility
│   ├── GwdLogo.tsx                # Razor-sharp SVG & PNG brand logo
│   ├── LeaderboardTable.tsx       # Standard & Projector stage view table
│   ├── Navbar.tsx                 # Navigation bar with user identity & status
│   ├── RatingRow.tsx              # 1-10 selector row with 10-cap enforcement
│   ├── ReviewModal.tsx            # Pre-submission review summary modal
│   ├── StickyRatingFooter.tsx     # Mobile & desktop sticky progress bar
│   └── TensCounter.tsx            # Visual 10s counter & indicator
├── lib/
│   ├── auth/index.ts              # Session signing, verification & rate limiting
│   ├── db/index.ts                # Transactional database, seed data & queries
│   └── rules/index.ts             # Pure business rules engine & tie-breakers
├── public/logos/                  # Brand assets (gwd.png, gwd-get-work-done.png)
└── tests/
    ├── integration.test.ts        # Database & atomic pipeline integration tests
    └── rules.test.ts              # Business rules & tie-breaker unit tests
```

---

## Quick Start & Verification

### 1. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Automated Test Suite
```bash
npm test
```
Executes all 18 unit and integration tests verifying scoring rules, 10s cap, atomic submissions, disqualification, and tie-breaking.

### 3. Run Production Build
```bash
npm run build
```

---

## 1-Click Evaluation Credentials

| Role | Username / Code | Password | Note |
|---|---|---|---|
| **Team Phoenix** | `T001` | `password123` | Active unsubmitted team ready for live rating test |
| **Team CyberPulse** | `T002` | `password123` | Already submitted in seed data |
| **Team Quantum** | `T003` | `password123` | Already submitted in seed data |
| **Admin Organizer** | `admin@gwd.com` | `admin1234` | Full event control & export access |

*Note: The login screen contains 1-click helper buttons to quickly test as either role without typing.*

---

## Deployment to Vercel

1. Commit and push repository to GitHub/GitLab:
   ```bash
   git add .
   git commit -m "Production-ready Team Rating Platform"
   git push origin main
   ```
2. Import repository in [Vercel](https://vercel.com).
3. Set Environment Variables (optional, defaults provided):
   - `SESSION_SECRET`: Random 32+ character string.
   - `ADMIN_BOOTSTRAP_EMAIL`: Custom admin email (default: `admin@gwd.com`).
   - `ADMIN_BOOTSTRAP_PASSWORD`: Custom admin password (default: `admin1234`).
4. Click **Deploy**. Vercel will build and deploy the Next.js application.
