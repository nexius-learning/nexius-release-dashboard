import { getClient } from 'azure-devops-extension-api'
import { PipelinesRestClient } from 'azure-devops-extension-api/Pipelines'

/**
 * Resolves the version of the app build(s) a deployment run consumed via its pipeline resources.
 *
 * The dashboard otherwise shows the *deploy* run's own number, which tells you nothing about which
 * application version is live. A deploy run declares the app builds it consumed under
 * `resources.pipelines.<alias>.version`; that value is the app's build number (e.g. GitVersion semver).
 *
 * When a deploy run consumes several pipeline resources (a repo with more than one deployable
 * component), we prefer the resource whose alias relates to the deployed stage (e.g. stage `Api_DEV`
 * -> alias `api_build`). Otherwise we return the single distinct version, or the first available.
 */
export async function getConsumedAppVersion(
    project: string,
    pipelineId: number,
    runId: number,
    stageName?: string
): Promise<string | undefined> {
    try {
        const client = getClient(PipelinesRestClient)
        // The generated Run type doesn't surface `resources`, so read it loosely.
        const run = (await client.getRun(project, pipelineId, runId)) as unknown as {
            resources?: { pipelines?: Record<string, { version?: string }> }
        }
        const pipelines = run?.resources?.pipelines
        if (!pipelines) return undefined

        const entries = Object.entries(pipelines).filter(([, v]) => !!v?.version)
        if (entries.length === 0) return undefined

        // Multi-component: prefer the resource alias that matches a token of the stage name.
        if (stageName && entries.length > 1) {
            const stageTokens = stageName
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter((t) => t.length > 2)
            const match = entries.find(([alias]) => {
                const a = alias.toLowerCase()
                return stageTokens.some((t) => a.includes(t))
            })
            if (match) return match[1].version
        }

        const distinct = Array.from(new Set(entries.map(([, v]) => v.version as string)))
        return distinct.length === 1 ? distinct[0] : entries[0][1].version
    } catch {
        // Version enrichment is best-effort; never break the grid over it.
        return undefined
    }
}
