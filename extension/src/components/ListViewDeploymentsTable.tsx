import { Table } from 'azure-devops-ui/Table'
import React from 'react'
import { IDashboardEnvironmentColumn, IEnvironmentInstance, IPipelineInstance } from '../types'
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider'
import { DeploymentTableCell } from './DeploymentTableCell'
import { useBuildAndApprovalData } from '../hooks/useBuildAndApprovalData'
import { extractBuildAndApprovalNames } from '../utils/pipelineUtils'
import { groupColumnsByStage, resolveEnvNameForColumn } from '../utils/stageGrouping'

export const ListViewDeploymentsTable = (props: {
    environments: IEnvironmentInstance[]
    pipelines: IPipelineInstance[]
    projectName?: string
    groupByStage?: boolean
}): JSX.Element => {
    const { environments, pipelines, projectName, groupByStage } = props

    // Use the shared hook for fetching build, approval, version and branch data
    const { buildNames, approvalNames, versions, branches } = useBuildAndApprovalData(pipelines, projectName)

    function getListViewColumns(environments: IEnvironmentInstance[]): Array<IDashboardEnvironmentColumn> {
        const columns: IDashboardEnvironmentColumn[] = []

        columns.push({
            id: 'name',
            name: '',
            renderCell: (index: number, columnIndex: number, tableColumn: IDashboardEnvironmentColumn, tableItem: IPipelineInstance) =>
                renderCell(index, columnIndex, tableColumn, tableItem),
            width: 250,
            conventionSortOrder: 0,
        } as IDashboardEnvironmentColumn)

        // In stage-grouped mode one column represents a deployment stage (id = `stage:<LABEL>`); otherwise
        // one column per environment name (id = env name), preserving the upstream layout.
        const columnSpecs = groupByStage
            ? groupColumnsByStage(environments)
            : environments.map((environment) => ({ id: environment.name!, label: environment.name! }))

        const dynamicColumns = columnSpecs.map((spec) => {
            return {
                id: spec.id,
                name: spec.label,
                renderCell: (index: number, columnIndex: number, tableColumn: IDashboardEnvironmentColumn, tableItem: IPipelineInstance) =>
                    renderCell(index, columnIndex, tableColumn, tableItem),
                width: 200,
            } as IDashboardEnvironmentColumn
        })

        return columns.concat(dynamicColumns)
    }

    const renderCell = (_index: number, columnIndex: number, tableColumn: IDashboardEnvironmentColumn, tableItem: IPipelineInstance) => {
        let buildName: string | undefined = undefined
        let approvalName: string | undefined = undefined
        let version: string | undefined = undefined
        let branch: string | undefined = undefined
        let environmentName: string | undefined = undefined

        if (tableColumn.id !== 'name') {
            environmentName = resolveEnvNameForColumn(tableItem, tableColumn.id)
            if (environmentName) {
                const result = extractBuildAndApprovalNames(tableItem, environmentName, buildNames, approvalNames, versions, branches)
                buildName = result.buildName
                approvalName = result.approvalName
                version = result.version
                branch = result.branch
            }
        }

        return (
            <DeploymentTableCell
                columnIndex={columnIndex}
                tableColumn={tableColumn}
                key={'col-' + columnIndex}
                tableItem={tableItem}
                buildName={buildName}
                approvalName={approvalName}
                version={version}
                branch={branch}
                environmentName={environmentName}
            />
        )
    }

    return (
        <Table className="deployments-table" columns={getListViewColumns(environments)} itemProvider={new ArrayItemProvider(pipelines)} />
    )
}
