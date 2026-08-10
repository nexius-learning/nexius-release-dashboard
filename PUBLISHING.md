# Publishing

The extension is published to the Azure DevOps Marketplace by CI, under the
Nexius service account — no personal tokens, no manual steps.

## How it works

1. In a PR, bump `version` in [`extension/configs/nexius.json`](extension/configs/nexius.json).
2. Merge to `main`.
3. The [Publish workflow](.github/workflows/publish.yml) runs on the merge —
   it builds, tests, and (because the version changed) publishes the new
   version to the Marketplace.

Merges that don't change the version don't publish, so ordinary changes never
fail on a duplicate version. You can also trigger the workflow manually
(**workflow_dispatch**) to force a publish of the current version.

## Configuration

- **Publisher** `BitwitZrt`, **extension id** `nexius-release-dashboard`
  (see `extension/configs/nexius.json`). Private extension, shared to the
  Nexius organization.
- **Repo secret** `AZURE_DEVOPS_MARKETPLACE_PAT` — a Marketplace (Manage) PAT
  of the `subscriptions@nexius.hu` service account, which is a member of the
  BitwitZrt publisher. CI authenticates as this account.

## Manual fallback

From `extension/`, with a Marketplace (Manage) token:

```sh
npm run compile
npx tfx extension publish \
  --manifest-globs vss-extension.json \
  --overrides-file configs/nexius.json \
  --token <PAT>
```
