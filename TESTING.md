# Test checklist (run after `npm install` in both folders)

Automated: `npm run typecheck` (root) and `cd server && npm run typecheck`, then `npm run build`.

## Sign-in
- [ ] Wrong password shows "Invalid email or password."; 5 wrong tries lock the account for 15 minutes
- [ ] Show/hide password, Remember me (still signed in after closing the browser), Forgot password link works
- [ ] Sign out returns to the login screen; reloading while signed out never shows data

## Upload and data
- [ ] Drag-and-drop and click-to-browse; a .pdf or .exe is rejected
- [ ] File with blank date, negative quantity, duplicate row, blank Shift: each appears on Upload and Data Health with the correct Excel row number
- [ ] Missing required column blocks Confirm; missing optional columns do not
- [ ] After Confirm and a page refresh the data is still there; "Demo data" is gone

## Pages (use filters on each)
- [ ] Overview: KPI numbers match a manual sum of your file; clicking a product bar filters the page
- [ ] Filters: Year, Month, Day, Team, Line, Reason, Shift, date range, search; Reset filters restores totals
- [ ] Product: picker, compare, streaks; Shift: heatmap cell opens the product; Defect: slice and bar clicks
- [ ] Production: streak counts vs the calendar; clicking a day opens Overview for that date
- [ ] Loss & Profit: "Cost data unavailable" without cost columns; entering a downtime rate changes totals everywhere
- [ ] Insights, Alerts (create action, change status, refresh), Improvement (record, remove), Root Cause (all 8 steps)
- [ ] Reports: all 9 types; PDF opens, Excel has one sheet per section; empty period disables downloads
- [ ] Ask AI and AI analysis (needs ANTHROPIC_API_KEY): answers match the tables; "not configured" without a key

## Layout
- [ ] Phone width (360px): menu button opens and closes the sidebar, tables scroll sideways, nothing overflows the page
- [ ] Tablet and desktop widths look right; no errors in the browser console
