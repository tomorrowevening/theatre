/**
 * Jest mock for static asset imports (.css, .svg, .png).
 *
 * Replaces identity-obj-proxy for asset imports because styled-components v6
 * calls `.toString()` on css`` interpolations, and identity-obj-proxy's
 * Proxy-based toString is not a callable function.
 */
module.exports = 'mock-asset'
