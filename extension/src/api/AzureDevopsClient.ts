import { getClient } from 'azure-devops-extension-api'
import { PipelinesRestClient } from 'azure-devops-extension-api/Pipelines'
import { TaskAgentRestClient } from 'azure-devops-extension-api/TaskAgent'
import {
    IDashboardEnvironmentPipeline,
    IEnvironmentPipelines,
    IEnvironmentDeploymentDictionary,
    IPipelineInstance,
    IEnvironmentInstance,
} from '../types'
import { isShownDeploymentResult, sortByConvention } from '../utilities'
import { mapWithConcurrency } from '../utils/concurrency'

/** Page size when listing environments. The API defaults to 50 and pages with a continuation token. */
const ENVIRONMENT_PAGE_SIZE = 500
/** Safety bound so a server that keeps handing back a token can never spin forever. */
const MAX_ENVIRONMENT_PAGES = 50
/** Deployment records are fetched per environment; keep several in flight without flooding the API. */
const DEPLOYMENT_FETCH_CONCURRENCY = 8

/**
 * Fetch EVERY environment in the project.
 *
 * The REST API returns 50 environments per page and hands back a continuation token. Reading only
 * the first page silently truncated the dashboard: pipelines that deploy exclusively to
 * environments beyond the first page never produced a row at all.
 */
async function getAllEnvironments(taskAgentClient: TaskAgentRestClient, projectName: string) {
    const all = []
    let continuationToken: string | undefined = undefined
    for (let page = 0; page < MAX_ENVIRONMENT_PAGES; page++) {
        const result = await taskAgentClient.getEnvironments(projectName, undefined, continuationToken, ENVIRONMENT_PAGE_SIZE)
        all.push(...result)
        continuationToken = result.continuationToken ?? undefined
        if (!continuationToken || result.length === 0) break
    }
    return all
}

export async function getDashboardEnvironmentPipeline(
    projectName: string,
    onlySuccessFailed = false
): Promise<IDashboardEnvironmentPipeline> {
    const taskAgentClient = getClient(TaskAgentRestClient)
    const pipelinesClient = getClient(PipelinesRestClient)

    const [pipelines, environments] = await Promise.all([
        pipelinesClient.listPipelines(projectName, 'name asc', 1000),
        getAllEnvironments(taskAgentClient, projectName),
    ])

    // One request per environment: fetched with bounded concurrency rather than one at a time,
    // otherwise a project with a few hundred environments takes minutes to render.
    const environmentPipelines: IEnvironmentPipelines[] = await mapWithConcurrency(
        environments,
        DEPLOYMENT_FETCH_CONCURRENCY,
        async (environment) => {
            const deployments = await taskAgentClient.getEnvironmentDeploymentExecutionRecords(projectName, environment.id, undefined, 1000)
            const environmentPipeline: IEnvironmentPipelines = {
                name: environment.name,
                pipeline: {},
            }
            for (const deployment of deployments) {
                // With the setting on, ignore skipped/canceled/in-progress records so the kept record
                // (first-per-pipeline = most recent) is the latest green/red deploy, not a skip.
                if (onlySuccessFailed && !isShownDeploymentResult(deployment.result)) continue
                const pipeline = pipelines.find((p) => p.id == deployment.definition.id)

                // Pipelines that are removed may still have deployments, but we don't want to show them.
                if (pipeline) {
                    if (!environmentPipeline.pipeline[pipeline.name]) {
                        environmentPipeline.pipeline[pipeline.name] = {
                            deployment: deployment, // owner.id will be used in UI to fetch build name
                            pipeline: pipeline,
                        }
                    }
                }
            }
            return environmentPipeline
        }
    )

    const pipelineInstancesArray = generatePipelineInstancesArray(environmentPipelines)

    return {
        environments: sortByConvention(environmentPipelines) as IEnvironmentPipelines[],
        pipelines: pipelineInstancesArray,
    }
}

function generatePipelineInstancesArray(environments: IEnvironmentPipelines[]): Array<IPipelineInstance> {
    const pipelineInfoArray: Array<IPipelineInstance> = []

    for (const environment of environments) {
        for (const key of Object.keys(environment.pipeline)) {
            const pipelineInfo = pipelineInfoArray.find((pr) => pr.key == key) ?? {
                key: key,
                name: environment.pipeline[key].pipeline?.name ?? '',
                environments: {} as IEnvironmentDeploymentDictionary,
                uri: environment.pipeline[key].deployment.definition._links['web'].href,
            }

            if (pipelineInfoArray.indexOf(pipelineInfo) === -1) {
                pipelineInfoArray.push(pipelineInfo)
            }

            if (environment.name === undefined) continue

            pipelineInfo.environments[environment.name] = {
                value: environment.pipeline[key].deployment.owner.name, // UI will resolve build name
                buildId: environment.pipeline[key].deployment.owner.id, // pass owner id for deferred lookup
                finishTime: environment.pipeline[key].deployment.finishTime,
                result: environment.pipeline[key].deployment.result,
                folder: environment.pipeline[key].pipeline?.folder,
                uri: environment.pipeline[key].deployment.owner?._links['web'].href,
                environmentId: environment.pipeline[key].deployment.environmentId, // Added to track environment ID
                stageName: environment.pipeline[key].deployment.stageName, // Added to track stage name
            }
        }
    }

    return pipelineInfoArray
}

/**
 * Fetches environments from pipelines
 * @param projectName : project name
 * @returns Promise: Array of IEnvironmentInstance
 */
export async function getEnvironmentsSortedByConvention(projectName: string): Promise<IEnvironmentInstance[]> {
    const taskAgentClient = getClient(TaskAgentRestClient)

    const environments = (await getAllEnvironments(taskAgentClient, projectName)).map((i) => {
        return {
            name: i.name,
        } as IEnvironmentInstance
    })
    return sortByConvention(environments) as IEnvironmentInstance[]
}
