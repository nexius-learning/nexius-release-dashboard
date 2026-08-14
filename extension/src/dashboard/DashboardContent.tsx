import { Card } from 'azure-devops-ui/Card'
import { CustomHeader, HeaderDescription, HeaderTitle, HeaderTitleArea, HeaderTitleRow, TitleSize } from 'azure-devops-ui/Header'
import { Page } from 'azure-devops-ui/Page'
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner'
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'azure-devops-ui/Link'
import { Button } from 'azure-devops-ui/Button'
import { FilterBar } from 'azure-devops-ui/FilterBar'
import { KeywordFilterBarItem } from 'azure-devops-ui/TextFilterBarItem'
import { DropdownFilterBarItem } from 'azure-devops-ui/Dropdown'
import { IListBoxItem } from 'azure-devops-ui/ListBox'
import { Filter, FILTER_CHANGE_EVENT } from 'azure-devops-ui/Utilities/Filter'
import { DropdownMultiSelection, DropdownSelection } from 'azure-devops-ui/Utilities/DropdownSelection'
import { IDashboardContentState } from '../types'
import { TreeViewDeploymentsTable } from '../components/TreeViewDeploymentsTable'
import { ListViewDeploymentsTable } from '../components/ListViewDeploymentsTable'
import { HeaderCommandBar, IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar'
import { IMenuItem } from 'azure-devops-ui/Menu'
import { filterPipelines } from '../utils/pipelineFiltering'

export type DashboardContentProps = {
    state: IDashboardContentState
}

enum ViewType {
    List = 'List View',
    Folder = 'Folder View',
}

export const DashboardContent = (props: DashboardContentProps) => {
    const {
        state: { environments, pipelines, projectInfo, isLoading, groupByStage },
    } = props

    const viewSelection = new DropdownSelection()
    const [viewType, setViewType] = useState(ViewType.List.toString())

    // Keyword search (pipeline name / folder) + environment filter.
    const filter = useMemo(() => new Filter(), [])
    const envSelection = useMemo(() => new DropdownMultiSelection(), [])
    const [activeFilter, setActiveFilter] = useState<{ keyword: string; environmentNames: string[] }>({
        keyword: '',
        environmentNames: [],
    })

    useEffect(() => {
        const onFilterChanged = () => {
            const rawEnvs = filter.getFilterItemValue<Array<string | IListBoxItem>>('environments') ?? []
            setActiveFilter({
                keyword: filter.getFilterItemValue<string>('keyword') ?? '',
                environmentNames: rawEnvs.map((v) => (typeof v === 'string' ? v : v.id)),
            })
        }
        filter.subscribe(onFilterChanged, FILTER_CHANGE_EVENT)
        return () => filter.unsubscribe(onFilterChanged, FILTER_CHANGE_EVENT)
    }, [filter])

    const environmentItems: IListBoxItem[] = useMemo(
        () => environments.filter((e) => !!e.name).map((e) => ({ id: e.name!, text: e.name! })),
        [environments]
    )

    const filteredPipelines = useMemo(
        () => filterPipelines(pipelines, activeFilter.keyword, activeFilter.environmentNames),
        [pipelines, activeFilter]
    )

    const pageHeaderCommandBarItems: IHeaderCommandBarItem[] = [
        {
            iconProps: { iconName: 'View' },
            id: 'deployment-dashboard-views',
            tooltipProps: { text: 'Select dashboard view' },
            important: true,
            text: viewType ?? 'Views',
            subMenuProps: {
                id: 'deployment-dashboard-view-options',
                items: Object.entries(ViewType).map(
                    ([_, value]) =>
                        ({
                            id: value,
                            text: value,
                        }) as IMenuItem
                ),
                onActivate: (item, _event) => setViewType(item.id),
            },
        },
        {
            iconProps: { iconName: 'Settings' },
            id: 'deployment-dashboard-settings',
            tooltipProps: { text: 'Navigate to Nexius Release Dashboard settings' },
            isPrimary: true,
            important: true,
            href: projectInfo?.settingsUri,
            target: '_top',
            text: 'Settings',
        },
    ]

    useEffect(() => {
        viewSelection.select(0)
    }, [])

    return (
        <Page className="flex-grow">
            <CustomHeader className="bolt-header-with-commandbar">
                <HeaderTitleArea>
                    <HeaderTitleRow>
                        <HeaderTitle ariaLevel={3} className="text-ellipsis" titleSize={TitleSize.Large}>
                            Nexius Release Dashboard
                        </HeaderTitle>
                    </HeaderTitleRow>
                    <HeaderDescription className="flex-row flex-center justify-space-between">
                        <div>Provides a view of your products, deployments, and environments in your project's build pipelines.</div>
                    </HeaderDescription>
                </HeaderTitleArea>
                <HeaderCommandBar items={pageHeaderCommandBarItems} />
            </CustomHeader>

            <div className="page-content page-content-top">
                {!isLoading && pipelines.length > 0 && (
                    <div className="margin-bottom-16">
                        <FilterBar filter={filter}>
                            <KeywordFilterBarItem filterItemKey="keyword" placeholder="Search by pipeline or folder" />
                            <DropdownFilterBarItem
                                filterItemKey="environments"
                                filter={filter}
                                items={environmentItems}
                                selection={envSelection}
                                placeholder="Environment"
                            />
                        </FilterBar>
                    </div>
                )}
                <Card>
                    {isLoading ? (
                        <div className="flex-grow padding-vertical-20 font-size-m">
                            <Spinner label="Loading data..." size={SpinnerSize.large} />
                        </div>
                    ) : pipelines && pipelines.length === 0 ? (
                        <div className="font-size-m flex-grow text-center padding-vertical-20">
                            <div className="margin-bottom-16 font-weight-heavy font-size-l">No deployments were found in any pipelines</div>
                            <Link
                                className="no-underline-link"
                                target="_top"
                                href="https://learn.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs?view=azure-devops"
                            >
                                Learn more
                            </Link>{' '}
                            about deployment jobs and how to set them up in your pipelines.
                            <div className="margin-top-16">
                                <Button text="View pipelines" primary={true} target="_top" href={projectInfo?.pipelinesUri} />
                            </div>
                        </div>
                    ) : filteredPipelines.length === 0 ? (
                        <div className="font-size-m flex-grow text-center padding-vertical-20 no-data">
                            No pipelines match the current filter.
                        </div>
                    ) : viewType === ViewType.List ? (
                        <ListViewDeploymentsTable
                            environments={environments}
                            pipelines={filteredPipelines}
                            projectName={projectInfo?.name}
                            groupByStage={groupByStage}
                        />
                    ) : (
                        <TreeViewDeploymentsTable
                            environments={environments}
                            pipelines={filteredPipelines}
                            projectName={projectInfo?.name}
                            groupByStage={groupByStage}
                        />
                    )}
                </Card>
            </div>
        </Page>
    )
}
