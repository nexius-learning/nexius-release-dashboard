import { mapWithConcurrency } from './concurrency'

const tick = () => new Promise((resolve) => setTimeout(resolve, 1))

describe('mapWithConcurrency', () => {
    it('preserves input order regardless of completion order', async () => {
        const items = [5, 1, 4, 2, 3]
        const result = await mapWithConcurrency(items, 2, async (n) => {
            // later items finish sooner, so completion order != input order
            await new Promise((resolve) => setTimeout(resolve, n))
            return n * 10
        })
        expect(result).toEqual([50, 10, 40, 20, 30])
    })

    it('never exceeds the concurrency limit', async () => {
        let inFlight = 0
        let peak = 0
        await mapWithConcurrency(
            Array.from({ length: 20 }, (_, i) => i),
            3,
            async () => {
                inFlight++
                peak = Math.max(peak, inFlight)
                await tick()
                inFlight--
            }
        )
        expect(peak).toBeLessThanOrEqual(3)
        expect(peak).toBeGreaterThan(1)
    })

    it('processes every item', async () => {
        const seen: number[] = []
        await mapWithConcurrency(
            Array.from({ length: 25 }, (_, i) => i),
            4,
            async (n) => {
                seen.push(n)
            }
        )
        expect(seen.sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i))
    })

    it('handles an empty list and a limit larger than the list', async () => {
        expect(await mapWithConcurrency([], 8, async () => 1)).toEqual([])
        expect(await mapWithConcurrency([1, 2], 99, async (n) => n + 1)).toEqual([2, 3])
    })
})
