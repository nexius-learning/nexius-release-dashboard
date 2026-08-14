# Publishing

The extension is published to the Azure DevOps Marketplace by CI, under the
Nexius service account — no personal tokens, no manual steps.

## How it works

1. In a PR, bump `version` in [`extension/configs/nexius.json`](extension/configs/nexius.json).
   Changes under `extension/configs/` require a code-owner review.
2. Merge to `main`.
3. The [Publish workflow](.github/workflows/publish.yml) runs on the merge —
   it builds and tests, then **waits for a maintainer to approve the
   `marketplace` environment deployment**. Only after that approval does it
   publish the new version to the Marketplace. Tagging and the GitHub release
   follow in a separate job once the publish succeeds.

A merged version bump alone never ships anything: the environment approval is
a separate, explicit human gate. Merges that don't change the version don't
publish at all — they build and test only, and never ask for an approval — so
ordinary changes never fail on a duplicate version. You can
also trigger the workflow manually (**workflow_dispatch**) to force a publish
of the current version — the same environment approval applies.

## Configuration

- **Publisher** `BitwitZrt`, **extension id** `nexius-release-dashboard`
  (see `extension/configs/nexius.json`). Private extension, shared to the
  Nexius organization.
- **Secret** `AZURE_DEVOPS_MARKETPLACE_PAT` — a Marketplace (Manage) PAT of a
  Nexius service account that is a member of the BitwitZrt publisher. CI
  authenticates as that account. Which account holds it is documented
  internally, not here.

## Manual fallback

From `extension/`, with a Marketplace (Manage) token:

```sh
npm run compile
npx tfx extension publish \
  --manifest-globs vss-extension.json \
  --overrides-file configs/nexius.json \
  --token <PAT>
```
