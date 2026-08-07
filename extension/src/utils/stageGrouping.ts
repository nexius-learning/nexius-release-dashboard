import { IEnvironmentInstance, IPipelineInstance } from '../types'

/**
 * Stage grouping (Nexius fork).
 *
 * Upstream renders ONE table column per distinct environment NAME. With per-app-per-stage
 * naming (e.g. `Player-DEV`, `mediaforge-QA`, ...) that produces a column per (app, stage) —
 * a sparse diagonal matrix that blows up as the number of pipelines grows.
 *
 * When the "group by stage" setting is on, this module collapses those environments into ONE
 * column per deployment stage (DEV / QA / STG / PROD / ...), so a row is an app and a column is
 * a stage regardless of how many apps exist. Environment names that don't carry a recognisable
 * stage token keep their own column (passthrough), so the upstream multi-environment layout is
 * preserved for anyone not using the `{app}-{stage}` convention.
 */

export const STAGE_COLUMN_PREFIX = 'stage:'

interface StageDef {
    label: string
    order: number
    tokens: string[]
}

// Ordered by typical promotion flow. `tokens` are matched as whole tokens (see parseStage),
// so 'prod' does not match inside 'product'. Nexius uses DEV -> QA -> STG -> PROD.
const STAGE_DEFS: StageDef[] = [
    { label: 'DEV', order: 10, tokens: ['dev', 'develop', 'development'] },
    { label: 'TEST', order: 20, tokens: ['test', 'tst'] },
    { label: 'QA', order: 30, tokens: ['qa', 'quality'] },
    { label: 'INT', order: 35, tokens: ['int', 'integration'] },
    { label: 'UAT', order: 40, tokens: ['uat'] },
    { label: 'STG', order: 50, tokens: ['stg', 'stage', 'staging'] },
    { label: 'PREPROD', order: 55, tokens: ['preprod', 'preproduction'] },
    { label: 'PROD', order: 60, tokens: ['prod', 'production', 'prd', 'live'] },
]

const TOKEN_TO_STAGE = new Map<string, StageDef>()
for (const def of STAGE_DEFS) {
    for (const token of def.tokens) TOKEN_TO_STAGE.set(token, def)
}

export interface IStageColumn {
    /** Column id: `stage:<LABEL>` for a grouped stage column, or the raw env name for a passthrough column. */
    id: string
    /** Display label: the stage label (e.g. 'DEV') or the raw env name. */
    label: string
    isStageColumn: boolean
    /** The canonical stage label when isStageColumn is true. */
    stageLabel?: string
}

/**
 * Extract the canonical deployment stage from an environment name.
 *
 * Tokenises on non-alphanumeric boundaries and scans from the END (the stage is by convention the
 * suffix, e.g. `mediaforge-api-DEV`), returning the first token that exactly matches a known stage
 * keyword. Returns null when no token is a recognised stage — such environments are not grouped.
 */
export function parseStage(envName?: string): { label: string; order: number } | null {
    if (!envName) return null
    const tokens = envName
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
    for (let i = tokens.length - 1; i >= 0; i--) {
        const def = TOKEN_TO_STAGE.get(tokens[i])
        if (def) return { label: def.label, order: def.order }
    }
    return null
}

/**
 * Build the ordered set of dashboard columns for stage-grouped mode.
 * Recognised stages first (by promotion order), then passthrough env columns (in first-seen order).
 */
export function groupColumnsByStage(environments: IEnvironmentInstance[]): IStageColumn[] {
    const stages = new Map<string, number>() // label -> order
    const passthrough: string[] = []

    for (const env of environments) {
        const parsed = parseStage(env.name)
        if (parsed) {
            if (!stages.has(parsed.label)) stages.set(parsed.label, parsed.order)
        } else if (env.name && passthrough.indexOf(env.name) === -1) {
            passthrough.push(env.name)
        }
    }

    const stageColumns: IStageColumn[] = Array.from(stages.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([label]) => ({ id: STAGE_COLUMN_PREFIX + label, label, isStageColumn: true, stageLabel: label }))

    const passthroughColumns: IStageColumn[] = passthrough.map((name) => ({ id: name, label: name, isStageColumn: false }))

    return [...stageColumns, ...passthroughColumns]
}

function finishTimeMs(pipeline: IPipelineInstance, envName: string): number {
    const t = pipeline.environments[envName]?.finishTime
    if (!t) return 0
    const ms = new Date(t).getTime()
    return isNaN(ms) ? 0 : ms
}

/**
 * For a given pipeline row and stage label, return the row's environment name deployed to that stage.
 * If several of the row's environments map to the same stage (e.g. legacy per-component naming), the
 * one with the most recent deployment wins so the cell reflects the latest activity for that stage.
 */
export function resolveEnvNameForStage(pipeline: IPipelineInstance, stageLabel: string): string | undefined {
    const matches = Object.keys(pipeline.environments).filter((name) => parseStage(name)?.label === stageLabel)
    if (matches.length <= 1) return matches[0]
    return matches.sort((a, b) => finishTimeMs(pipeline, b) - finishTimeMs(pipeline, a))[0]
}

/**
 * Resolve a column id to the actual environment name for a pipeline row.
 * Stage columns (`stage:<LABEL>`) resolve per-row; passthrough columns are the env name itself.
 */
export function resolveEnvNameForColumn(pipeline: IPipelineInstance, columnId: string): string | undefined {
    if (columnId.startsWith(STAGE_COLUMN_PREFIX)) {
        return resolveEnvNameForStage(pipeline, columnId.slice(STAGE_COLUMN_PREFIX.length))
    }
    return columnId
}
