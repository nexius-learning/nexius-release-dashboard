import { ColumnSorting, SortOrder, Table } from 'azure-devops-ui/Table'
import React, { useMemo, useState } from 'react'
import { IDashboardEnvironmentColumn, IEnvironmentInstance, IPipelineInstance } from '../types'
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider'
import { DeploymentTableCell } from './DeploymentTableCell'
import { useBuildAndApprovalData } from '../hooks/useBuildAndApprovalData'
import { extractBuildAndApprovalNames } from '../utils/pipelineUtils'
import { groupColumnsByStage, resolveEnvNameForColumn } from '../utils/stageGrouping'
import { compareByColumnFinishTime, compareByName } from '../utils/pipelineFiltering'

interface ISortState {
    columnIndex: number
    order: SortOrder
}

export const ListViewDeploymentsTable = (props: {
    environments: IEnvironmentInstance[]
    pipelines: IPipelineInstance[]
    projectName?: string
    groupByStage?: boolean
}): JSX.Element => {
    const { environments, pipelines, projectName, groupByStage } = props
    const [sorting, setSorting] = useState<ISortState | undefined>(undefined)

    // Use the shared hook for fetching build, approval, version and branch data
    const { buildNames, approvalNames, versions, branches } = useBuildAndApprovalData(pipelines, projectName)

    // In stage-grouped mode one column represents a deployment stage (id = `stage:<LABEL>`); otherwise
    // one column per environment name (id = env name), preserving the upstream layout.
    const columnSpecs = useMemo(
        () =>
            groupByStage
                ? groupColumnsByStage(environments)
                : environments.map((environment) => ({ id: environment.name!, label: environment.name! })),
        [environments, groupByStage]
    )

    // Column-click sorting: the name column sorts alphabetically; an environment/stage column sorts
    // by that column's latest deployment time (rows never deployed there go last).
    const sortedPipelines = useMemo(() => {
        if (!sorting) return pipelines
        const comparator = sorting.columnIndex === 0 ? compareByName : compareByColumnFinishTime(columnSpecs[sorting.columnIndex - 1].id)
        const sorted = [...pipelines].sort(comparator)
        return sorting.order === SortOrder.descending ? sorted.reverse() : sorted
    }, [pipelines, sorting, columnSpecs])

    const sortingBehavior = useMemo(
        () =>
            new ColumnSorting<IPipelineInstance>((columnIndex: number, proposedSortOrder: SortOrder) =>
                setSorting({ columnIndex, order: proposedSortOrder })
            ),
        []
    )

    function getListViewColumns(): Array<IDashboardEnvironmentColumn> {
        const columns: IDashboardEnvironmentColumn[] = []

        columns.push({
            id: 'name',
            name: '',
            renderCell: (index: number, columnIndex: number, tableColumn: IDashboardEnvironmentColumn, tableItem: IPipelineInstance) =>
                renderCell(index, columnIndex, tableColumn, tableItem),
            width: 250,
            conventionSortOrder: 0,
            sortProps: sorting?.columnIndex === 0 ? { sortOrder: sorting.order } : {},
        } as IDashboardEnvironmentColumn)

        const dynamicColumns = columnSpecs.map((spec, i) => {
            return {
                id: spec.id,
                name: spec.label,
                renderCell: (index: number, columnIndex: number, tableColumn: IDashboardEnvironmentColumn, tableItem: IPipelineInstance) =>
                    renderCell(index, columnIndex, tableColumn, tableItem),
                width: 200,
                sortProps: sorting?.columnIndex === i + 1 ? { sortOrder: sorting.order } : {},
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
        <Table
            className="deployments-table"
            columns={getListViewColumns()}
            behaviors={[sortingBehavior]}
            // Render every row: the page scrolls, so virtualization would otherwise stop
            // materializing rows after the first viewport (the "only ~13 rows" symptom).
            virtualize={false}
            itemProvider={new ArrayItemProvider(sortedPipelines)}
        />
    )
}
