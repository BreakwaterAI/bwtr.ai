# Breakwater-owned lead capture replacement

This is a replacement deployment, not an update to the legacy deployment.
The public website endpoint stays unchanged until receipt in the new Sheet is
verified and the website release is approved. Never put lead exports in this repo.

## Deploy under the organization account

1. Sign in as `nagu@bwtr.ai` and open the new `Breakwater Website Leads` spreadsheet.
2. Open **Extensions > Apps Script**. If a project already exists, inspect and
   preserve its code before replacing anything. Name the new project
   `Breakwater Website Lead Capture`.
3. Paste this directory's `Code.gs` into the new project's `Code.gs` and save.
4. In **Project Settings > Script properties**, set `SPREADSHEET_ID` to the ID
   between `/d/` and `/edit` in the new spreadsheet URL. Keep the Sheet private.
5. Run `verifySetup` from the editor and authorize it as `nagu@bwtr.ai`.
   This verifies destination access and the exact 14 headers without inserting data.
6. Choose **Deploy > New deployment > Web app**. Set **Execute as: Me**
   (`nagu@bwtr.ai`) and **Who has access: Anyone**. Public access is for this
   intake endpoint, not for the spreadsheet. If domain policy prevents anonymous
   web apps, ask the Workspace administrator; do not weaken Sheet sharing.
7. Deploy and provide the resulting URL ending in `/exec`, not the editor-only
   `/dev` URL. Do not provide passwords, OAuth tokens, or credentials.

## Verification and cutover

- Confirm the deployer account in the deployment UI. Owning the spreadsheet
  alone does not prove ownership of the deployment.
- GET verifies only liveness. With explicit test permission, send one clearly
  labeled synthetic inquiry and verify its actual row in `Leads!A:N`.
- Test the browser form against the new endpoint and verify the row; `no-cors`
  success cannot prove receipt. Inspect email/name/message field mapping.
- Only then update the website endpoint, rebuild, validate, and release with
  approval. Leave the previous endpoint and sheet available for rollback.
- Reconcile historical leads separately, preserving source dates and avoiding
  duplicates. No historical data has been copied by this setup.

The script fails closed on missing configuration, wrong tab name or header order.
It retains the current schema, honeypot, length limits and formula escaping; uses
server receipt time; serializes writes; and returns generic errors without lead
data. The optional `user_agent` is only a submitted string, never a trusted signal.
The honeypot is basic spam filtering, not authentication or comprehensive abuse protection.

Run offline tests with `node scripts/test-org-lead-capture.mjs`.

References: [web app deployment](https://developers.google.com/apps-script/guides/web),
[bound-script web-app limitations](https://developers.google.com/apps-script/guides/bound).
