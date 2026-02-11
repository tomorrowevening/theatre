import type {ProjectState_Historic} from '@tomorrowevening/theatre-core/projects/store/storeTypes'
import type {graphEditorColors} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/GraphEditor/GraphEditor'
import type {
  PathToProp_Encoded,
  ProjectAddress,
  SheetAddress,
  SheetObjectAddress,
  WithoutSheetInstance,
} from '@tomorrowevening/theatre-shared/utils/addresses'
import type {StrictRecord} from '@tomorrowevening/theatre-shared/utils/types'
import type {PointableSet} from '@tomorrowevening/theatre-shared/utils/PointableSet'
import type Project from '@tomorrowevening/theatre-core/projects/Project'
import type Sheet from '@tomorrowevening/theatre-core/sheets/Sheet'
import type SheetObject from '@tomorrowevening/theatre-core/sheetObjects/SheetObject'
import type {
  ObjectAddressKey,
  PaneInstanceId,
  ProjectId,
  SequenceMarkerId,
  SequenceEventId,
  SequenceSubSequenceId,
  SheetId,
  SheetInstanceId,
  UIPanelId,
} from '@tomorrowevening/theatre-shared/utils/ids'

export type PanelPosition = {
  edges: {
    left: {
      from: 'screenLeft' | 'screenRight'
      distance: number
    }
    right: {
      from: 'screenLeft' | 'screenRight'
      distance: number
    }
    top: {
      from: 'screenTop' | 'screenBottom'
      distance: number
    }
    bottom: {
      from: 'screenTop' | 'screenBottom'
      distance: number
    }
  }
}

type Panels = {
  sequenceEditor?: {
    graphEditor?: {
      isOpen?: boolean
      height?: number
    }
    rightPanelOpen?: boolean
    dopesheetLeftWidth?: number
  }
  objectEditor?: {}
  outlinePanel?: {
    selection?: OutlineSelectionState[]
  }
}

export type PanelId = keyof Panels

export type OutlineSelectionState =
  | ({type: 'Project'} & ProjectAddress)
  | ({type: 'Sheet'} & WithoutSheetInstance<SheetAddress>)
  | ({type: 'SheetObject'} & WithoutSheetInstance<SheetObjectAddress>)

export type OutlineSelectable = Project | Sheet | SheetObject
export type OutlineSelection = OutlineSelectable[]

export type PaneInstanceDescriptor = {
  instanceId: PaneInstanceId
  paneClass: string
}

/**
 * Marker allows you to mark notable positions in your sequence.
 *
 * See root {@link StudioHistoricState}
 */
export type StudioHistoricStateSequenceEditorMarker = {
  id: SequenceMarkerId
  label?: string
  /**
   * The position this marker takes in the sequence.
   *
   * Usually, this value is measured in seconds, but the unit could be varied based on the kind of
   * unit you're using for mapping to the position (e.g. Position=1 = 10px of scrolling)
   */
  position: number
}

/**
 * Event allows you to trigger actions at specific positions in your sequence.
 *
 * See root {@link StudioHistoricState}
 */
export type StudioHistoricStateSequenceEditorEvent = {
  id: SequenceEventId
  name: string
  /**
   * The position this event takes in the sequence.
   */
  position: number
  /**
   * Optional value associated with the event
   */
  value?: any
}

/**
 * SubSequence allows you to nest sequences within other sequences.
 * Similar to After Effects Compositions.
 *
 * See root {@link StudioHistoricState}
 */
export type StudioHistoricStateSequenceEditorSubSequence = {
  id: SequenceSubSequenceId
  /**
   * The ID of the sheet/sequence being referenced
   */
  sheetId: string
  /**
   * The position where this sub-sequence starts in the parent sequence
   */
  position: number
  /**
   * Optional duration override. If not specified, uses the referenced sequence's duration
   */
  duration?: number
  /**
   * Optional time scale factor. Default is 1.0 (normal speed)
   * 2.0 = double speed, 0.5 = half speed
   */
  timeScale?: number
  /**
   * Optional label for UI display
   */
  label?: string
}

/**
 * See parent {@link StudioHistoricStateProject}.
 * See root {@link StudioHistoricState}
 */
export type StudioHistoricStateProjectSheet = {
  selectedInstanceId: undefined | SheetInstanceId
  sequenceEditor: {
    markerSet?: PointableSet<
      SequenceMarkerId,
      StudioHistoricStateSequenceEditorMarker
    >
    eventSet?: PointableSet<
      SequenceEventId,
      StudioHistoricStateSequenceEditorEvent
    >
    subSequenceSet?: PointableSet<
      SequenceSubSequenceId,
      StudioHistoricStateSequenceEditorSubSequence
    >
    selectedPropsByObject: StrictRecord<
      ObjectAddressKey,
      StrictRecord<PathToProp_Encoded, keyof typeof graphEditorColors>
    >
  }
}

/** See {@link StudioHistoricState} */
export type StudioHistoricStateProject = {
  stateBySheetId: StrictRecord<SheetId, StudioHistoricStateProjectSheet>
}

export type StudioHistoricState = {
  projects: {
    stateByProjectId: StrictRecord<ProjectId, StudioHistoricStateProject>
  }

  /** Panels can contain panes */
  panels?: Panels
  /** Panels can contain panes */
  panelPositions?: {[panelId in UIPanelId]?: PanelPosition}
  // This is misspelled, but I think some users are dependent on the exact shape of this stored JSON
  // So, we cannot easily change it without providing backwards compatibility.
  panelInstanceDesceriptors: StrictRecord<
    PaneInstanceId,
    PaneInstanceDescriptor
  >
  /** Tracks the order in which panes were last focused (last item is most recent) */
  paneFocusOrder?: PaneInstanceId[]
  autoKey: boolean
  coreByProject: Record<ProjectId, ProjectState_Historic>
}
