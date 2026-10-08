# GWD Team Rating Platform — Operational & Event Day Runbook

This guide outlines operational procedures for running live competitions, hackathons, and tournament pitch rounds.

---

## 1. Event Lifecycle & Workflow

```
[ DRAFT ] 
   │
   ▼
[ REGISTRATION ] ──► Teams self-register or admin imports roster via CSV
   │
   ▼
[ FREEZE ROSTER ] ──► Fixes total active teams (N); fixes eligible targets (N - 1)
   │
   ▼
[ OPEN VOTING ] ──► Participating teams log in, rate targets, review & submit
   │
   ▼
[ CLOSE VOTING ] ──► Voting locked; final leaderboard finalized
   │
   ▼
[ STAGE REVEAL ] ──► Toggle Leaderboard Visibility ON; Projector Mode
   │
   ▼
[ EXPORT ] ──► Download Leaderboard CSV & Full Rating Matrix CSV
```

---

## 2. Dynamic Team Count ($N$)

- The platform adapts to **any number of participating teams** ($N$).
- Targets to rate = $N - 1$.
- Self-rating is impossible at both UI and database API levels.
- The 5-tens rule allows giving a 10 to at most $\min(5, N - 1)$ teams.
- All metrics (e.g., *"Rated X of 7"*, *"Voting Progress: 44%"*) are calculated dynamically.

---

## 3. How to Conduct a Dry Run / Rehearsal

1. Open `/login` and click **"1-Click Demo Login as Admin"**.
2. Go to **Organizer Command Center** (`/admin`).
3. Click **"Reset Demo"** in the top bar to initialize a clean demo event with 8 teams.
4. Open an Incognito / Private window, navigate to `/login`, and click **"Team Phoenix (T001)"**.
5. Practice voting on other teams:
   - Rate teams with various scores (1 to 10).
   - Try awarding five 10s: observe that the 10 button disables on remaining teams.
   - Change one of the 10s to a 9: observe that the 10 slot frees up again.
   - Click **Review & Submit** to verify the breakdown modal.
   - Click **Submit Final Ratings**: verify the lock screen appears.
6. Open the public leaderboard (`/leaderboard`):
   - Notice that Team Phoenix's ratings are immediately included in the live calculation.
   - Toggle **Projector / Stage View** to test the display on a projector or external monitor.
7. Return to the admin console:
   - Notice the submission progress increases.
   - Test the **Unlock** action on a team to practice handling a participant requesting to change their votes.
   - Test **Export Leaderboard CSV** and **Export Rating Matrix CSV**.

---

## 4. Troubleshooting & Edge Case Recovery

### Team refreshed or lost connection halfway through voting
- Draft ratings are automatically saved both on the server and in the browser's `localStorage`.
- When the team logs back in or reconnects, all previously selected ratings are restored.

### Team clicked "Submit" twice
- The submission pipeline is strictly atomic and idempotent.
- The first request locks the submission; the second request returns `ALREADY_SUBMITTED` without duplicating ratings or corrupting scores.

### Team made an error and needs to change their submitted ratings
1. Log into `/admin`.
2. Locate the team in the **Submission Monitor** or **Team Roster** table.
3. Click the **Unlock** button.
4. The team's submission lock is removed, their ratings are converted back to draft status, and the action is logged in the audit trail.
5. The team can now adjust their ratings and submit again.

### A team withdraws or is disqualified during the event
1. Log into `/admin`.
2. Find the team and click **Disqualify** or set status to `WITHDRAWN`.
3. The team can no longer log in, cannot rate, and cannot be rated.
4. Any ratings they received or gave are excluded from the leaderboard calculation.
5. The leaderboard updates to reflect the remaining approved teams.

### Leaderboard needs to remain secret until the award ceremony
1. In `/admin`, toggle **Public Leaderboard Visibility** to **Hidden**.
2. Participants and public visitors on `/leaderboard` will see an informational card stating that rankings are hidden for the final reveal.
3. Organizers can still see the live scores inside the admin console.
4. When ready to announce winners on stage, toggle visibility to **Visible** and launch **Projector View**.
