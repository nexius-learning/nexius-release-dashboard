/**
 * Run an async mapper over items with a bounded number of operations in flight, preserving
 * input order. Used to keep the dashboard's per-environment / per-deployment REST fan-out from
 * firing hundreds of simultaneous requests (which Azure DevOps throttles) on large projects.
 */
export async function mapWithConcurrency<TItem, TResult>(
    items: TItem[],
    limit: number,
    mapper: (item: TItem) => Promise<TResult>
): Promise<TResult[]> {
    const results: TResult[] = new Array(items.length)
    let cursor = 0
    const worker = async () => {
        while (true) {
            const index = cursor++
            if (index >= items.length) return
            results[index] = await mapper(items[index])
        }
    }
    await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker))
    return results
}
