/// <reference types="vss-web-extension-sdk" />
import React from 'react'
import { Card } from 'azure-devops-ui/Card'
import { CustomHeader, HeaderDescription, HeaderTitle, HeaderTitleArea, HeaderTitleRow, TitleSize } from 'azure-devops-ui/Header'
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner'
import { DragAndDropGripper, Table } from 'azure-devops-ui/Table'
import { Link } from 'azure-devops-ui/Link'
import { Button } from 'azure-devops-ui/Button'
import { Page } from 'azure-devops-ui/Page'
import { HeaderCommandBar, IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar'
import { ListDragDropBehavior, ListDragImage } from 'azure-devops-ui/List'
import { Toggle } from 'azure-devops-ui/Toggle'
import { IEnvironmentInstance, ISettingsContentProps } from '../types'
import './Settings.scss'
import { downloadJson } from '../utilities'
import { diagnostics } from '../diagnostics'

export const SettingsContent = (props: ISettingsContentProps) => {
    const { state, onResetToDefaultSortOrder, onSaveCustomSortOrder, onTableRowDrop, onToggleGroupByStage, onToggleOnlySuccessFailed } =
        props
    const environmentsCardHeaderCommandBarItems: IHeaderCommandBarItem[] = [
        {
            id: 'reset-sort-order-settings',
            text: 'Reset to default',
            onActivate: onResetToDefaultSortOrder,
            iconProps: {
                iconName: 'Undo',
            },
        },
        {
            id: 'sort-order-save',
            text: 'Save',
            isPrimary: true,
            onActivate: onSaveCustomSortOrder,
            iconProps: {
                iconName: 'Save',
            },
        },
    ]

    const pageHeaderCommandBarItems: IHeaderCommandBarItem[] = [
        {
            iconProps: { iconName: 'ViewDashboard' },
            id: 'deployment-dashboard',
            tooltipProps: { text: 'Navigate to PivotPro Release Dashboard' },
            isPrimary: true,
            important: true,
            href: state.projectInfo?.deploymentDashboardUri,
            target: '_top',
            text: 'View dashboard',
        },
        {
            iconProps: { iconName: 'Download' },
            id: 'diagnostic-dump',
            tooltipProps: { text: 'Export a diagnostic package' },
            isPrimary: false,
            important: false,
            // href: state.projectInfo?.deploymentDashboardUri,
            target: '_top',
            text: 'Export Diagnostics',
            onActivate: () => {
                downloadDiagnosticData()
            },
        },
    ]

    const downloadDiagnosticData = async () => {
        const data = await diagnostics()
        downloadJson(data, `dashboard_diagnostics_${new Date().getTime()}.json`)
    }

    const dragDropBehavior = new ListDragDropBehavior<IEnvironmentInstance>({
        allowedTypes: ['IEnvironmentInstance'],
        id: 'environment-dragndrop-behavior',
        type: 'IEnvironmentInstance',
        renderDragImage: (event) => <ListDragImage text={event.detail.dataTransfer.data.name ?? 'UNKNOWN ENVIRONMENT'} />,
        onDrop: onTableRowDrop,
    })

    function renderGripper(_: number, left: boolean) {
        if (left) {
            return <DragAndDropGripper />
        }
        return null
    }

    return (
        <Page className="flex-grow setting-page">
            <CustomHeader className="bolt-header-with-commandbar">
                <HeaderTitleArea>
                    <HeaderTitleRow>
                        <HeaderTitle ariaLevel={3} className="text-ellipsis" titleSize={TitleSize.Large}>
                            PivotPro Release Dashboard Settings
                        </HeaderTitle>
                    </HeaderTitleRow>
                    <HeaderDescription>Customise PivotPro Release Dashboard</HeaderDescription>
                </HeaderTitleArea>
                <HeaderCommandBar items={pageHeaderCommandBarItems} />
            </CustomHeader>

            <div className="page-content page-content-top">
                <Card
                    className="bolt-card-white"
                    titleProps={{ text: 'Column grouping' }}
                    headerDescriptionProps={{
                        text: 'Group dashboard columns by deployment stage (DEV/QA/STG/PROD) instead of one column per environment. Use this when environments are named per app and stage (e.g. Player-DEV, mediaforge-QA) to keep the grid from growing a column per app.',
                    }}
                >
                    <div className="flex-row flex-center rhythm-horizontal-8 padding-vertical-8">
                        <Toggle
                            offText={'One column per environment'}
                            onText={'Group columns by stage'}
                            checked={state.groupByStage ?? false}
                            onChange={(_event, value) => onToggleGroupByStage && onToggleGroupByStage(value)}
                        />
                    </div>
                </Card>

                <Card
                    className="bolt-card-white"
                    titleProps={{ text: 'Deployment states' }}
                    headerDescriptionProps={{
                        text: 'Show only succeeded (green) and failed (red) deployments. Skipped, canceled and in-progress records are hidden, so a cell reflects the last real deploy (or nothing) instead of a skipped stage.',
                    }}
                >
                    <div className="flex-row flex-center rhythm-horizontal-8 padding-vertical-8">
                        <Toggle
                            offText={'Show all deployment states'}
                            onText={'Only succeeded / failed'}
                            checked={state.onlySuccessFailed ?? false}
                            onChange={(_event, value) => onToggleOnlySuccessFailed && onToggleOnlySuccessFailed(value)}
                        />
                    </div>
                </Card>

                <Card
                    headerCommandBarItems={environmentsCardHeaderCommandBarItems}
                    className="bolt-card-white bolt-table-card"
                    titleProps={{ text: 'Manual sort environments' }}
                    headerDescriptionProps={{ text: 'Sort environments in the order you wish them to appear in the dashboard' }}
                >
                    {state.isLoading ? (
                        <div className="flex-grow padding-vertical-20 font-size-m">
                            <Spinner label="Loading data..." size={SpinnerSize.large} />
                        </div>
                    ) : state.environments && state.environments.length > 0 ? (
                        <Table<IEnvironmentInstance>
                            id="environments-table"
                            spacerWidth={20}
                            className="environments-table"
                            columns={state.columns}
                            itemProvider={state.environments}
                            behaviors={[dragDropBehavior]}
                            renderSpacer={renderGripper}
                        />
                    ) : (
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
                                <Button text="View pipelines" primary={true} target="_top" href={state.projectInfo?.pipelinesUri} />
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </Page>
    )
}
