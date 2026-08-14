import { IPipelineInstance } from '../types'
import { compareByColumnFinishTime, compareByName, filterPipelines, matchesEnvironments, matchesKeyword } from './pipelineFiltering'

const pipeline = (name: string, envs: Record<string, { finishTime?: string; folder?: string }>): IPipelineInstance => {
    const environments: IPipelineInstance['environments'] = {}
    Object.keys(envs).forEach((envName) => {
        environments[envName] = {
            value: '1.0.0',
            result: 0,
            finishTime: (envs[envName].finishTime ? new Date(envs[envName].finishTime!) : undefined) as unknown as Date,
            folder: envs[envName].folder,
            uri: '',
            buildId: 1,
            environmentId: 1,
            stageName: envName,
        }
    })
    return { key: name, name, uri: '', environments }
}

const player = pipeline('Player-deploy', { 'Player-DEV': { finishTime: '2026-08-01T10:00:00Z', folder: '\\Frontend' } })
const mediaforge = pipeline('mediaforge-deploy', { 'mediaforge-DEV': { finishTime: '2026-08-02T10:00:00Z', folder: '\\Backend' } })
const statics = pipeline('static-content - Deploy', {
    'static-content-DEV': { finishTime: '2026-08-03T10:00:00Z', folder: '\\Backend' },
    'static-content-PROD': { finishTime: '2026-08-04T10:00:00Z', folder: '\\Backend' },
})

describe('matchesKeyword', () => {
    it('matches case-insensitively on the pipeline name', () => {
        expect(matchesKeyword(player, 'player')).toBe(true)
        expect(matchesKeyword(player, 'MEDIA')).toBe(false)
    })
    it('matches on the folder path', () => {
        expect(matchesKeyword(mediaforge, 'backend')).toBe(true)
        expect(matchesKeyword(player, 'backend')).toBe(false)
    })
    it('empty keyword matches everything', () => {
        expect(matchesKeyword(player, '')).toBe(true)
        expect(matchesKeyword(player, '   ')).toBe(true)
    })
})

describe('matchesEnvironments / filterPipelines', () => {
    it('keeps rows deployed to any selected environment', () => {
        expect(matchesEnvironments(statics, ['static-content-PROD'])).toBe(true)
        expect(matchesEnvironments(player, ['static-content-PROD'])).toBe(false)
        expect(matchesEnvironments(player, [])).toBe(true)
    })
    it('combines keyword and environment filters', () => {
        const all = [player, mediaforge, statics]
        expect(filterPipelines(all, '', []).length).toBe(3)
        expect(filterPipelines(all, 'deploy', []).length).toBe(3)
        expect(filterPipelines(all, 'static', []).map((p) => p.name)).toEqual(['static-content - Deploy'])
        expect(filterPipelines(all, '', ['Player-DEV']).map((p) => p.name)).toEqual(['Player-deploy'])
        expect(filterPipelines(all, 'backend', ['static-content-PROD']).map((p) => p.name)).toEqual(['static-content - Deploy'])
    })
})

describe('sorting comparators', () => {
    it('compareByName sorts alphabetically', () => {
        expect([statics, player, mediaforge].sort(compareByName).map((p) => p.name)).toEqual([
            'mediaforge-deploy',
            'Player-deploy',
            'static-content - Deploy',
        ])
    })
    it('compareByColumnFinishTime puts the latest deployment first and rows without one last', () => {
        const dev1 = pipeline('a', { 'X-DEV': { finishTime: '2026-08-01T00:00:00Z' } })
        const dev2 = pipeline('b', { 'X-DEV': { finishTime: '2026-08-05T00:00:00Z' } })
        const none = pipeline('c', { 'X-PROD': { finishTime: '2026-08-09T00:00:00Z' } })
        const sorted = [dev1, none, dev2].sort(compareByColumnFinishTime('X-DEV'))
        expect(sorted.map((p) => p.name)).toEqual(['b', 'a', 'c'])
    })
    it('resolves stage columns to the row environment (grouped mode)', () => {
        const p1 = pipeline('one', { 'app1-DEV': { finishTime: '2026-08-01T00:00:00Z' } })
        const p2 = pipeline('two', { 'app2-DEV': { finishTime: '2026-08-06T00:00:00Z' } })
        const sorted = [p1, p2].sort(compareByColumnFinishTime('stage:DEV'))
        expect(sorted.map((p) => p.name)).toEqual(['two', 'one'])
    })
})
