import * as React from 'react'
import { ITreeColumn, renderExpandableTreeCell, Tree } from 'azure-devops-ui/TreeEx'
import { ITreeItem, ITreeItemEx, TreeItemProvider } from 'azure-devops-ui/Utilities/TreeItemProvider'
import { IItemProvider } from 'azure-devops-ui/Utilities/Provider'
import { IReadonlyObservableValue } from 'azure-devops-ui/Core/Observable'
import { IDeploymentTableItem, IPipelineInstance, IDashboardEnvironmentColumn } from '../types'
import { IEnvironmentInstance } from '../types'
import { SimpleTableCell } from 'azure-devops-ui/Table'
import { useState, useEffect } from 'react'
import { ITreeItemProvider } from 'azure-devops-ui/Utilities/TreeItemProvider'
import { DeploymentTableCell } from './DeploymentTableCell'
import { useBuildAndApprovalData } from '../hooks/useBuildAndApprovalData'
import { extractBuildAndApprovalNames } from '../utils/pipelineUtils'
import { groupColumnsByStage, resolveEnvNameForColumn } from '../utils/stageGrouping'

export const TreeViewDeploymentsTable = (props: {
    environments: IEnvironmentInstance[]
    pipelines: IPipelineInstance[]
    projectName?: string
    groupByStage?: boolean
}): JSX.Element => {
    const { environments, pipelines, projectName, groupByStage } = props
    const [folderViewItemProvider, setFolderViewItemProvider] = useState<ITreeItemProvider<IDeploymentTableItem>>()

    // Use the shared hook for fetching build, approval, version and branch data
    const { buildNames, approvalNames, versions, branches } = useBuildAndApprovalData(pipelines, projectName)

    useEffect(() => {
        if (pipelines && environments) buildTreeView()
    }, [pipelines, environments, buildNames, approvalNames, versions, branches])

    const buildTreeView = () => {
        let treeNodeItems: ITreeItem<IDeploymentTableItem>[] = []
        pipelines!.forEach((pipeline: IPipelineInstance) => {
            let folder = pipeline.environments[Object.keys(pipeline.environments)[0]]?.folder!
            let paths = folder.split('\\')

            // Remove the first empty path, set paths to [] at root level
            paths.shift()
            if (paths.length === 1 && paths[0] === '') paths = []

            addToTreeNodes(treeNodeItems, paths, pipeline)
        })

        setFolderViewItemProvider(new TreeItemProvider<IDeploymentTableItem>(treeNodeItems))
    }

    const addToTreeNodes = (pathChildren: ITreeItem<IDeploymentTableItem>[], paths: string[], pipelineInfo: IPipelineInstance) => {
        if (paths.length === 0) {
            pathChildren.push({
                data: {
                    name: pipelineInfo.name,
                    pipeline: pipelineInfo,
                } as IDeploymentTableItem,
                childItems: [],
                expanded: true,
            })
        } else {
            let existingNode = pathChildren.find((item) => item.data.name === paths[0])

            if (!existingNode) {
                existingNode = {
                    data: {
                        name: paths[0],
                    } as IDeploymentTableItem,
                    childItems: [],
                    expanded: true,
                }

                pathChildren.push(existingNode)
            }

            paths.shift()
            addToTreeNodes(existingNode!.childItems!, paths, pipelineInfo)
        }
    }

    const getFolderViewColumns = (): ITreeColumn<IDeploymentTableItem>[] => {
        let columns: ITreeColumn<IDeploymentTableItem>[] = []

        columns.push({
            id: 'name',
            name: '',
            width: 300,
            renderCell: renderExpandableTreeCell,
        })

        // Stage-grouped: one column per deployment stage (id = `stage:<LABEL>`); otherwise one per env name.
        const columnSpecs = groupByStage
            ? groupColumnsByStage(environments)
            : environments.map((env) => ({ id: env.name!, label: env.name! }))

        let dynamicColumns = columnSpecs.map((spec) => {
            return {
                id: spec.id,
                name: spec.label,
                width: !spec.label ? 300 : 200,
                renderCell: renderTreeViewCell,
                isFixedColumn: true,
            }
        })

        return columns.concat(dynamicColumns)
    }

    const renderTreeViewCell = <T extends IDeploymentTableItem>(
        _rowIndex: number,
        columnIndex: number,
        treeColumn: ITreeColumn<T>,
        treeItem: ITreeItemEx<T>,
        _ariaRowIndex?: number | undefined,
        _role?: string
    ): JSX.Element => {
        let pipeline = treeItem.underlyingItem.data.pipeline

        // If row isn't a leaf node, then return no data indicator
        if (treeItem.underlyingItem.childItems && treeItem.underlyingItem.childItems.length > 0) {
            return (
                <SimpleTableCell key={'col-' + columnIndex} columnIndex={columnIndex}>
                    <div className="no-data">-</div>
                </SimpleTableCell>
            )
        }

        // Resolve the column (env name, or a `stage:<LABEL>` token in grouped mode) to this row's env name.
        const environmentName = pipeline ? resolveEnvNameForColumn(pipeline, treeColumn.id) : undefined

        // If there's no pipeline (folder node) or no environment data for this pipeline
        if (!pipeline || !environmentName || !pipeline.environments[environmentName]) {
            return (
                <SimpleTableCell key={'col-' + columnIndex} columnIndex={columnIndex}>
                    <div className="no-data">-</div>
                </SimpleTableCell>
            )
        }

        // Extract build, approval, version and branch using shared utility
        const { buildName, approvalName, version, branch } = extractBuildAndApprovalNames(
            pipeline,
            environmentName,
            buildNames,
            approvalNames,
            versions,
            branches
        )

        // Create a compatible table column for DeploymentTableCell
        const tableColumn: IDashboardEnvironmentColumn = {
            id: treeColumn.id,
            name: treeColumn.name,
            minWidth: 100,
            maxWidth: typeof treeColumn.width === 'number' ? treeColumn.width : 200,
            width: typeof treeColumn.width === 'number' ? treeColumn.width : 200,
            renderCell: () => <></>,
        }

        return (
            <DeploymentTableCell
                columnIndex={columnIndex}
                tableColumn={tableColumn}
                key={'col-' + columnIndex}
                tableItem={pipeline}
                buildName={buildName}
                approvalName={approvalName}
                version={version}
                branch={branch}
                environmentName={environmentName}
            />
        )
    }

    return (
        <>
            {folderViewItemProvider && (
                <Tree<IDeploymentTableItem>
                    className="deployments-table"
                    columns={getFolderViewColumns()}
                    itemProvider={
                        folderViewItemProvider as IItemProvider<
                            ITreeItemEx<IDeploymentTableItem> | IReadonlyObservableValue<ITreeItemEx<IDeploymentTableItem>>
                        >
                    }
                    onToggle={(_, treeItem: ITreeItemEx<IDeploymentTableItem>) => {
                        folderViewItemProvider!.toggle(treeItem.underlyingItem)
                    }}
                    scrollable={true}
                    // Render every row — with page-level scrolling, virtualization would stop
                    // materializing rows after the first viewport.
                    virtualize={false}
                />
            )}
        </>
    )
}
