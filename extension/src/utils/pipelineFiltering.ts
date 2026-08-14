import { IPipelineInstance } from '../types'
import { resolveEnvNameForColumn } from './stageGrouping'

/**
 * Search / filter / sort helpers for the dashboard grid (Nexius fork).
 * Pure functions so they are unit-testable independently of the UI components.
 */

function pipelineFolder(pipeline: IPipelineInstance): string {
    const firstEnv = Object.keys(pipeline.environments)[0]
    return (firstEnv && pipeline.environments[firstEnv]?.folder) || ''
}

/** Case-insensitive substring match on the pipeline name and its folder path. */
export function matchesKeyword(pipeline: IPipelineInstance, keyword: string): boolean {
    const needle = keyword.trim().toLowerCase()
    if (!needle) return true
    return pipeline.name.toLowerCase().indexOf(needle) !== -1 || pipelineFolder(pipeline).toLowerCase().indexOf(needle) !== -1
}

/** True when the pipeline has a deployment on at least one of the selected environments. */
export function matchesEnvironments(pipeline: IPipelineInstance, environmentNames: string[]): boolean {
    if (!environmentNames.length) return true
    return environmentNames.some((name) => !!pipeline.environments[name])
}

/** Apply the keyword search and environment filter to the pipeline rows. */
export function filterPipelines(pipelines: IPipelineInstance[], keyword: string, environmentNames: string[]): IPipelineInstance[] {
    if (!keyword.trim() && !environmentNames.length) return pipelines
    return pipelines.filter((p) => matchesKeyword(p, keyword) && matchesEnvironments(p, environmentNames))
}

/** Ascending name comparator (locale-aware). The table inverts it for descending. */
export function compareByName(a: IPipelineInstance, b: IPipelineInstance): number {
    return a.name.localeCompare(b.name)
}

function finishTimeMs(pipeline: IPipelineInstance, columnId: string): number | undefined {
    const envName = resolveEnvNameForColumn(pipeline, columnId)
    const t = envName ? pipeline.environments[envName]?.finishTime : undefined
    if (!t) return undefined
    const ms = new Date(t as unknown as string).getTime()
    return isNaN(ms) ? undefined : ms
}

/**
 * Comparator for an environment (or stage:) column: newest deployment first in
 * ascending table order, rows without a deployment on that column always last —
 * so clicking an env column surfaces "most recently deployed there" on top.
 */
export function compareByColumnFinishTime(columnId: string): (a: IPipelineInstance, b: IPipelineInstance) => number {
    return (a, b) => {
        const ta = finishTimeMs(a, columnId)
        const tb = finishTimeMs(b, columnId)
        if (ta === undefined && tb === undefined) return compareByName(a, b)
        if (ta === undefined) return 1
        if (tb === undefined) return -1
        return tb - ta
    }
}
