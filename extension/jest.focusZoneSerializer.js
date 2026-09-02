// azure-devops-ui assigns FocusZone ids from a module-level counter, so
// `data-focuszone="focuszone-41"` reflects how many components the process has
// constructed rather than anything about the rendered markup. Any change to the
// transform or to module evaluation order shifts every id and fails the snapshot
// on a difference that is not a difference. Normalise the counter away so the
// snapshots assert structure.
const FOCUSZONE_ID = /focuszone-\d+/g

module.exports = {
    test: (value) => typeof value === 'string' && FOCUSZONE_ID.test(value),
    serialize: (value, config, indentation, depth, refs, printer) =>
        printer(value.replace(FOCUSZONE_ID, 'focuszone-[id]'), config, indentation, depth, refs),
}
