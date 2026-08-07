import { IEnvironmentInstance, IPipelineInstance } from '../types'
import { groupColumnsByStage, parseStage, resolveEnvNameForColumn, resolveEnvNameForStage } from './stageGrouping'

const env = (name: string): IEnvironmentInstance => ({ name })

const pipeline = (name: string, envs: Record<string, { finishTime?: string }>): IPipelineInstance => {
    const environments: IPipelineInstance['environments'] = {}
    Object.keys(envs).forEach((envName) => {
        environments[envName] = {
            value: '1.0.0',
            result: 0,
            finishTime: (envs[envName].finishTime ? new Date(envs[envName].finishTime!) : new Date(0)) as unknown as Date,
            uri: '',
            buildId: 1,
            environmentId: 1,
            stageName: envName,
        }
    })
    return { key: name, name, uri: '', environments }
}

describe('parseStage', () => {
    it.each([
        ['Player-DEV', 'DEV'],
        ['mediaforge-api-DEV', 'DEV'],
        ['mediaforge-QA', 'QA'],
        ['Player-STG', 'STG'],
        ['Player-PROD', 'PROD'],
        ['Production', 'PROD'],
        ['development', 'DEV'],
        ['staging', 'STG'],
        ['team_uat_01', 'UAT'],
    ])('parses %s -> %s', (name, expected) => {
        expect(parseStage(name)?.label).toBe(expected)
    })

    it('does not match a stage keyword embedded in a larger word', () => {
        expect(parseStage('product-catalog')).toBeNull() // "product" != "prod" token
        expect(parseStage('devops-tools')).toBeNull() // "devops" != "dev" token
    })

    it('returns null for names without a stage token', () => {
        expect(parseStage('Sandbox')).toBeNull()
        expect(parseStage(undefined)).toBeNull()
        expect(parseStage('')).toBeNull()
    })

    it('prefers the suffix token when several stages appear', () => {
        expect(parseStage('dev-mirror-of-prod')?.label).toBe('PROD')
    })
})

describe('groupColumnsByStage', () => {
    it('collapses per-app-per-stage environments into one column per stage, in promotion order', () => {
        const cols = groupColumnsByStage([
            env('Player-PROD'),
            env('Player-DEV'),
            env('mediaforge-QA'),
            env('Player-QA'),
            env('mediaforge-DEV'),
            env('Player-STG'),
        ])
        expect(cols.map((c) => c.label)).toEqual(['DEV', 'QA', 'STG', 'PROD'])
        expect(cols.every((c) => c.isStageColumn)).toBe(true)
        expect(cols[0].id).toBe('stage:DEV')
    })

    it('keeps non-conforming environments as their own passthrough columns after the stages', () => {
        const cols = groupColumnsByStage([env('Player-DEV'), env('Sandbox'), env('Player-PROD')])
        expect(cols.map((c) => c.label)).toEqual(['DEV', 'PROD', 'Sandbox'])
        expect(cols.find((c) => c.label === 'Sandbox')?.isStageColumn).toBe(false)
        expect(cols.find((c) => c.label === 'Sandbox')?.id).toBe('Sandbox')
    })
})

describe('resolveEnvNameForStage / resolveEnvNameForColumn', () => {
    it('maps a stage column to the row-specific environment name', () => {
        const p = pipeline('Player', { 'Player-DEV': {}, 'Player-QA': {}, 'Player-PROD': {} })
        expect(resolveEnvNameForStage(p, 'DEV')).toBe('Player-DEV')
        expect(resolveEnvNameForColumn(p, 'stage:PROD')).toBe('Player-PROD')
    })

    it('returns undefined when the row has no environment for that stage', () => {
        const p = pipeline('Player', { 'Player-DEV': {} })
        expect(resolveEnvNameForStage(p, 'PROD')).toBeUndefined()
    })

    it('picks the most recent deployment when several envs map to the same stage', () => {
        const p = pipeline('mediaforge', {
            'mediaforge-api-DEV': { finishTime: '2026-01-01T00:00:00Z' },
            'mediaforge-jobeventhandler-DEV': { finishTime: '2026-07-01T00:00:00Z' },
        })
        expect(resolveEnvNameForStage(p, 'DEV')).toBe('mediaforge-jobeventhandler-DEV')
    })

    it('passes a non-stage column id through unchanged', () => {
        const p = pipeline('Player', { Sandbox: {} })
        expect(resolveEnvNameForColumn(p, 'Sandbox')).toBe('Sandbox')
    })
})
