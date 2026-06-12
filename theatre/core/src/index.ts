/**
 * The library providing the runtime functionality of Theatre.js.
 *
 * @packageDocumentation
 */

export {
  getProject,
  onChange,
  val,
  notify,
  types,
  createRafDriver,
} from './coreExports'
export type {IRafDriver} from './coreExports'
export type {IProject, IProjectConfig} from './projects/TheatreProject'
export type {ISequence, IAttachAudioArgs} from './sequences/TheatreSequence'
export type {IPlaybackRange, IPlaybackDirection} from './sequences/Sequence'
export type {
  Keyframe,
  KeyframeType,
  SheetState_Historic,
  HistoricPositionalSequence,
  TrackData,
  BasicKeyframedTrack,
  SequenceMarker,
  SequenceEvent,
  SubSequence,
  SequenceAudioAttachment,
  TrackDataCommon,
} from './projects/store/types/SheetState_Historic'
export type {ISheetObject} from './sheetObjects/TheatreSheetObject'
export type {
  ISheet,
  SheetObjectActionsConfig,
  SheetObjectAction,
} from './sheets/TheatreSheet'
export type {
  UnknownShorthandCompoundProps,
  UnknownValidCompoundProps,
  PropsValue,
  ShorthandCompoundPropsToLonghandCompoundProps,
  UnknownShorthandProp,
  LonghandCompoundPropsToInitialValue,
  ShorthandPropToLonghandProp,
} from './propTypes'
export type {
  CommonOpts,
  ISimplePropType,
  DeepPartialCompound,
  DeepPartial,
} from './propTypes'
export type {
  OnDiskState,
  ProjectState_Historic,
} from './projects/store/storeTypes'
export type {
  ProjectAddress,
  SheetAddress,
  SheetObjectAddress,
  WithoutSheetInstance,
  PathToProp_Encoded,
  PathToProp,
} from '@tomorrowevening/theatre-shared/utils/addresses'
export {encodePathToProp} from '@tomorrowevening/theatre-shared/utils/addresses'
export type {
  VoidFn,
  DeepPartialOfSerializableValue,
  $IntentionalAny,
  SerializableValue,
  SerializableMap,
  SerializablePrimitive,
  StrictRecord,
} from '@tomorrowevening/theatre-shared/utils/types'
export type {
  KeyframeId,
  ProjectId,
  SheetId,
  SheetInstanceId,
  ObjectAddressKey,
  SequenceTrackId,
  SequenceMarkerId,
  SequenceEventId,
  SequenceSubSequenceId,
} from '@tomorrowevening/theatre-shared/utils/ids'
export type {Asset, File} from '@tomorrowevening/theatre-shared/utils/assets'
export type {Nominal} from '@tomorrowevening/theatre-shared/utils/Nominal'
export type {Rgba} from '@tomorrowevening/theatre-shared/utils/color'
export type {Notifiers, Notify} from '@tomorrowevening/theatre-shared/notify'
import * as globalVariableNames from '@tomorrowevening/theatre-shared/globalVariableNames'
import type StudioBundle from '@tomorrowevening/theatre-studio/StudioBundle'
import CoreBundle from './CoreBundle'
import type {OnDiskState} from './projects/store/storeTypes'

/**
 * NOTE: **INTERNAL and UNSTABLE** - This _WILL_ break between minor versions.
 *
 * This type represents the object returned by `studio.createContnentOfSaveFile()`. It's
 * meant for advanced users who want to interact with the state of projects. In the vast
 * majority of cases, you __should not__ use this type. Either an API for your use-case
 * already exists, or you should open an issue on GitHub: https://github.com/theatre-js/theatre/issues
 *
 */
export type __UNSTABLE_Project_OnDiskState = OnDiskState

registerCoreBundle()

/**
 * @remarks
 * the studio and core need to communicate with each other somehow, and currently we do that
 * by registering each of them as a global variable. This function does the work of registering
 * the core bundle (everything exported from `@tomorrowevening/theatre-core`) to window.__TheatreJS_CoreBundle.
 */
function registerCoreBundle() {
  // This only works in a browser environment
  if (typeof window == 'undefined') return

  // another core bundle may already be registered

  const existingBundle: CoreBundle | undefined =
    // @ts-ignore ignore
    window[globalVariableNames.coreBundle]

  if (typeof existingBundle !== 'undefined') {
    if (
      typeof existingBundle === 'object' &&
      existingBundle &&
      typeof existingBundle.version === 'string'
    ) {
      /*
      Another core bundle is registered. This usually means the bundler is not configured correctly and
      is bundling `@tomorrowevening/theatre-core` multiple times, but, there are legitimate scenarios where a user may want
      to include multiple instances of `@tomorrowevening/theatre-core` on the same page.

      For example, an article might embed two separate interactive graphics that
      are made by different teams (and even different tech stacks -- one in JS, the other in clojurescript).

      If both of those graphics use Theatre.js, our current setup makes them conflict with one another.

      ----------------------
      --------------------
      ----------------------
      -------.

      |   /\_/\   |
      |  ( o.o )  |      --------> graphic1 made with JS+Theatre.js
      |   > ^ <   |

      ## ---
      ----------------------
      --------------------
      ----------------------
      -------.

      |    __      _   |
      |  o'')}____//   | --------> graphic2 made with clojurescript+Theatre.js
      |  `_/      )    |
      |  (_(_/-(_/     |
      
      ---------------------
      -----♥.

      @todo Make it possible to have multiple separate bundles on the same page, but still communicate
      that there is more than one bundle so we can warn the user about bundler misconfiguration.
      
      */
      throw new Error(
        `It seems that the module '@tomorrowevening/theatre-core' is loaded more than once. This could have two possible causes:\n` +
          `1. You might have two separate versions of Theatre.js in node_modules.\n` +
          `2. Or this might be a bundling misconfiguration, in case you're using a bundler like Webpack/ESBuild/Rollup.\n\n` +
          `Note that it **is okay** to import '@tomorrowevening/theatre-core' multiple times. But those imports should point to the same module.`,
      )
    } else {
      throw new Error(
        `The variable window.${globalVariableNames.coreBundle} seems to be already set by a module other than @tomorrowevening/theatre-core.`,
      )
    }
  }

  const coreBundle = new CoreBundle()

  // @ts-ignore ignore
  window[globalVariableNames.coreBundle] = coreBundle

  const possibleExistingStudioBundle: undefined | StudioBundle =
    // @ts-ignore ignore
    window[globalVariableNames.studioBundle]

  if (
    possibleExistingStudioBundle &&
    possibleExistingStudioBundle !== null &&
    possibleExistingStudioBundle.type === 'Theatre_StudioBundle'
  ) {
    possibleExistingStudioBundle.registerCoreBundle(coreBundle)
  }
}
