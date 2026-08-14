# Nexius Release Dashboard

A deployment overview for the Azure Pipelines hub — see all your recent
pipeline deployments at a glance:

- Pipeline name
- Deployed app version and source branch
- Success / failure status and time
- Which environments have been deployed to
- Approver, where an approval gate was used

You'll find this helpful if your teams have:

- **Automated deployments** — spot the failed ones so you can re-release or
  roll back / forward.
- **Many pipelines** — folder grouping gives better visibility of what's
  deployed where.
- **Multiple environments** — optionally group columns by stage
  (DEV / QA / STG / PROD) instead of one column per environment.
- **Noise from skipped stages** — optionally show only succeeded / failed
  deployments.
- **Many rows** — search by pipeline name or folder, filter by environment,
  and sort by name or by a column's latest deployment.

The column-grouping and status options are on the **Settings** page.
