import type Ticker from '../Ticker'
import type {$IntentionalAny, VoidFn} from '../types'

type IDependent = (msgComingFrom: Prism<$IntentionalAny>) => void

/**
 * Common interface for derivations.
 */
export interface Prism<V> {
  /**
   * Whether the object is a derivation.
   */
  isPrism: true

  /**
   * Whether the derivation is hot.
   */
  isHot: boolean

  /**
   * Calls `listener` with a fresh value every time the prism _has_ a new value, throttled by Ticker.
   */
  onChange(
    ticker: Ticker,
    listener: (v: V) => void,
    immediate?: boolean,
  ): VoidFn

  onStale(cb: () => void): VoidFn

  /**
   * Keep the derivation hot, even if there are no tappers (subscribers).
   */
  keepHot(): VoidFn

  /**
   * Add a derivation as a dependent of this derivation.
   *
   * @param d - The derivation to be made a dependent of this derivation.
   *
   * @see _removeDependent
   *
   * @internal
   */
  _addDependent(d: IDependent): void

  /**
   * Remove a derivation as a dependent of this derivation.
   *
   * @param d - The derivation to be removed from as a dependent of this derivation.
   *
   * @see _addDependent
   * @internal
   */
  _removeDependent(d: IDependent): void

  /**
   * Gets the current value of the derivation. If the value is stale, it causes the derivation to freshen.
   */
  getValue(): V
}

/**
 * Returns whether `d` is a derivation.
 */
export function isPrism(d: any): d is Prism<unknown> {
  return d && d.isPrism && d.isPrism === true
}