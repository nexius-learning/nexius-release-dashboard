# Nexius Release Dashboard

An Azure DevOps extension that adds a deployment-overview page to the Azure
Pipelines hub — a summary of recent deployments across your YAML pipelines and
ADO Environments.

It adds a **Nexius Release Dashboard** item to the Pipelines menu. The grid
shows, per pipeline and environment: the deployed app version, the source
branch, deployment status and time — plus the approver where an approval gate
was used.

## Nexius additions over upstream

- **Deployed version + source branch per cell** — resolves the consumed app
  build version from the deploy run (not just the deploy run number) and the
  branch it came from.
- **Group columns by stage** (opt-in) — collapse per-app-per-stage
  environments (e.g. `Player-DEV`, `mediaforge-QA`) into DEV / QA / STG / PROD
  columns, so the grid doesn't grow a column per app.
- **Only succeeded / failed** (opt-in) — hide skipped, canceled and
  in-progress records, so a cell shows the last real deploy rather than a
  skipped stage.

Both options are toggles on the dashboard **Settings** page (default off).

## Development & publishing

- [Developer guide](extension/DEV_GUIDE.md) — local dev, hot reload, debugging.
- [Contributing](./CONTRIBUTING.md) — code style and PR guidance.
- [Publishing](./PUBLISHING.md) — automated via CI on a version bump.

## Credits

A fork of SixPivot's [PivotPro Release Dashboard](https://github.com/SixPivot/AzureDevopsDeploymentDashboard),
used under the MIT License — see [LICENSE](./LICENSE.md).
