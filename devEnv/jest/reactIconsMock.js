/**
 * Jest mock for react-icons modules.
 *
 * Returns a no-op React component for any named icon import
 * (e.g. HiOutlineChevronRight, IoClose, VscTriangleUp).
 */
module.exports = new Proxy(
  {},
  {
    get(_target, name) {
      // Return a simple function component that renders nothing
      return function MockIcon() {
        return null
      }
    },
  },
)
