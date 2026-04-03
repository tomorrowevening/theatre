/**
 * Jest mock for react-merge-refs.
 *
 * Returns a no-op mergeRefs function that returns an empty callback,
 * matching the real signature: mergeRefs(refs) => (node) => void.
 */
module.exports = {
  mergeRefs: () => () => {},
}
