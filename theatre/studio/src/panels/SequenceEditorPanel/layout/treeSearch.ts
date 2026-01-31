import type {
  SequenceEditorTree,
  SequenceEditorTree_SheetObject,
  SequenceEditorTree_PropWithChildren,
  SequenceEditorTree_PrimitiveProp,
} from './tree'
import {setCollapsedSheetItem} from '@tomorrowevening/theatre-studio/panels/SequenceEditorPanel/DopeSheet/setCollapsedSheetObjectOrCompoundProp'

/**
 * Expands all sheet objects and compound properties that contain matches for the search term.
 * This modifies the actual collapsed state in the Theatre.js store, not just the filtered view.
 */
export function expandMatchingItems(
  tree: SequenceEditorTree,
  searchTerm: string,
): void {
  if (!searchTerm.trim()) {
    return
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()

  // Expand all sheet objects that have matches
  tree.children.forEach((sheetObject) => {
    if (shouldExpandSheetObject(sheetObject, normalizedSearchTerm)) {
      // Expand the sheet object itself
      setCollapsedSheetItem(false, {
        sheetAddress: sheetObject.sheetObject.address,
        sheetItemKey: sheetObject.sheetItemKey,
      })

      // Expand any compound properties that have matches
      expandMatchingProps(
        sheetObject.children,
        normalizedSearchTerm,
        sheetObject.sheetObject.address,
      )
    }
  })
}

/**
 * Stores the original collapsed state before searching so it can be restored later.
 * This is a simple in-memory store - in a production app you might want to use a more sophisticated approach.
 */
const originalCollapsedStates = new Map<string, boolean>()

/**
 * Stores the collapsed state of items before expanding them for search.
 */
function storeOriginalCollapsedState(tree: SequenceEditorTree): void {
  tree.children.forEach((sheetObject) => {
    const sheetKey = `${sheetObject.sheetObject.address.projectId}:${sheetObject.sheetObject.address.sheetId}:${sheetObject.sheetItemKey}`
    originalCollapsedStates.set(sheetKey, sheetObject.isCollapsed)

    storePropsCollapsedState(
      sheetObject.children,
      sheetObject.sheetObject.address,
    )
  })
}

function storePropsCollapsedState(
  props: Array<
    SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp
  >,
  sheetAddress: any,
): void {
  props.forEach((prop) => {
    if (prop.type === 'propWithChildren') {
      const propKey = `${sheetAddress.projectId}:${sheetAddress.sheetId}:${prop.sheetItemKey}`
      originalCollapsedStates.set(propKey, prop.isCollapsed)

      storePropsCollapsedState(prop.children, sheetAddress)
    }
  })
}

/**
 * Restores the original collapsed state when search is cleared.
 */
export function restoreOriginalCollapsedState(tree: SequenceEditorTree): void {
  tree.children.forEach((sheetObject) => {
    const sheetKey = `${sheetObject.sheetObject.address.projectId}:${sheetObject.sheetObject.address.sheetId}:${sheetObject.sheetItemKey}`
    const originalState = originalCollapsedStates.get(sheetKey)

    if (
      originalState !== undefined &&
      originalState !== sheetObject.isCollapsed
    ) {
      setCollapsedSheetItem(originalState, {
        sheetAddress: sheetObject.sheetObject.address,
        sheetItemKey: sheetObject.sheetItemKey,
      })
    }

    restorePropsCollapsedState(
      sheetObject.children,
      sheetObject.sheetObject.address,
    )
  })

  // Clear the stored states
  originalCollapsedStates.clear()
}

function restorePropsCollapsedState(
  props: Array<
    SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp
  >,
  sheetAddress: any,
): void {
  props.forEach((prop) => {
    if (prop.type === 'propWithChildren') {
      const propKey = `${sheetAddress.projectId}:${sheetAddress.sheetId}:${prop.sheetItemKey}`
      const originalState = originalCollapsedStates.get(propKey)

      if (originalState !== undefined && originalState !== prop.isCollapsed) {
        setCollapsedSheetItem(originalState, {
          sheetAddress,
          sheetItemKey: prop.sheetItemKey,
        })
      }

      restorePropsCollapsedState(prop.children, sheetAddress)
    }
  })
}

function shouldExpandSheetObject(
  sheetObject: SequenceEditorTree_SheetObject,
  searchTerm: string,
): boolean {
  const objectName = sheetObject.sheetObject.address.objectKey.toLowerCase()
  const objectMatches = objectName.includes(searchTerm)

  if (objectMatches) {
    return true
  }

  // Check if any child properties match
  return sheetObject.children.some((child) => propHasMatches(child, searchTerm))
}

function expandMatchingProps(
  props: Array<
    SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp
  >,
  searchTerm: string,
  sheetAddress: any,
): void {
  props.forEach((prop) => {
    if (prop.type === 'propWithChildren') {
      const propName =
        prop.pathToProp[prop.pathToProp.length - 1]?.toString().toLowerCase() ||
        ''
      const propMatches = propName.includes(searchTerm)
      const hasMatchingChildren = prop.children.some((child) =>
        propHasMatches(child, searchTerm),
      )

      if (propMatches || hasMatchingChildren) {
        // Expand this compound property
        setCollapsedSheetItem(false, {
          sheetAddress,
          sheetItemKey: prop.sheetItemKey,
        })

        // Recursively expand matching child properties
        expandMatchingProps(prop.children, searchTerm, sheetAddress)
      }
    }
  })
}

function propHasMatches(
  prop: SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp,
  searchTerm: string,
): boolean {
  const propName =
    prop.pathToProp[prop.pathToProp.length - 1]?.toString().toLowerCase() || ''
  const propMatches = propName.includes(searchTerm)

  if (propMatches) {
    return true
  }

  if (prop.type === 'propWithChildren') {
    return prop.children.some((child) => propHasMatches(child, searchTerm))
  }

  return false
}
/**
 * Filters the sequence editor tree based on a search term.
 * Shows sheet objects and properties that contain the search term in their names.
 * When a sheet object name matches, ALL of its properties are included.
 * When a compound property matches, ALL of its children are included (e.g., searching "position" shows "x", "y", "z").
 * When searching, all matching items and their parent containers are automatically expanded.
 */
export function filterSequenceEditorTree(
  tree: SequenceEditorTree,
  searchTerm: string,
): SequenceEditorTree {
  if (!searchTerm.trim()) {
    // Restore original collapsed state when search is cleared
    restoreOriginalCollapsedState(tree)
    return tree
  }

  // Store original collapsed state before expanding (only on first search)
  if (originalCollapsedStates.size === 0) {
    storeOriginalCollapsedState(tree)
  }

  // Expand all matching items in the original tree structure
  expandMatchingItems(tree, searchTerm)

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()

  const filteredChildren = tree.children
    .map((sheetObjectLeaf) =>
      filterSheetObject(sheetObjectLeaf, normalizedSearchTerm),
    )
    .filter((leaf): leaf is SequenceEditorTree_SheetObject => leaf !== null)

  // Recalculate positions and heights for filtered tree
  let topSoFar = tree.top
  let nSoFar = tree.n

  const recalculatedChildren = filteredChildren.map((child) => {
    const recalculated = recalculatePositions(child, topSoFar, nSoFar)
    topSoFar = recalculated.top + recalculated.heightIncludingChildren
    nSoFar = recalculated.n + 1
    return recalculated
  })

  return {
    ...tree,
    children: recalculatedChildren,
    heightIncludingChildren: topSoFar - tree.top,
    // Expand the root sheet when searching to show all results
    isCollapsed: false,
  }
}

function filterSheetObject(
  sheetObject: SequenceEditorTree_SheetObject,
  searchTerm: string,
): SequenceEditorTree_SheetObject | null {
  const objectName = sheetObject.sheetObject.address.objectKey.toLowerCase()
  const objectMatches = objectName.includes(searchTerm)

  if (objectMatches) {
    // If the sheet object name matches, include ALL properties (not just matching ones)
    return {
      ...sheetObject,
      children: sheetObject.children, // Include all properties
      // Always expand sheet objects when searching to reveal all matches
      isCollapsed: false,
    }
  } else {
    // If the sheet object name doesn't match, only include properties that match
    const filteredChildren = sheetObject.children
      .map((child) => filterProp(child, searchTerm))
      .filter(
        (
          child,
        ): child is
          | SequenceEditorTree_PropWithChildren
          | SequenceEditorTree_PrimitiveProp => child !== null,
      )

    // Show the sheet object if it has properties that match the search term
    if (filteredChildren.length > 0) {
      return {
        ...sheetObject,
        children: filteredChildren,
        // Always expand sheet objects when searching to reveal all matches
        isCollapsed: false,
      }
    }
  }

  return null
}

function filterProp(
  prop: SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp,
  searchTerm: string,
):
  | SequenceEditorTree_PropWithChildren
  | SequenceEditorTree_PrimitiveProp
  | null {
  const propName =
    prop.pathToProp[prop.pathToProp.length - 1]?.toString().toLowerCase() || ''
  const propMatches = propName.includes(searchTerm)

  if (prop.type === 'primitiveProp') {
    return propMatches ? prop : null
  }

  // For compound props (propWithChildren)
  if (propMatches) {
    // If the parent property matches, include ALL children (not just matching ones)
    return {
      ...prop,
      children: prop.children, // Include all children
      // Always expand compound props when searching to reveal nested matches
      isCollapsed: false,
    }
  } else {
    // If the parent doesn't match, only include children that match
    const filteredChildren = prop.children
      .map((child) => filterProp(child, searchTerm))
      .filter(
        (
          child,
        ): child is
          | SequenceEditorTree_PropWithChildren
          | SequenceEditorTree_PrimitiveProp => child !== null,
      )

    // Show the compound prop if it has children that match the search term
    if (filteredChildren.length > 0) {
      return {
        ...prop,
        children: filteredChildren,
        // Always expand compound props when searching to reveal nested matches
        isCollapsed: false,
      }
    }
  }

  return null
}

function recalculatePositions(
  node: SequenceEditorTree_SheetObject,
  startTop: number,
  startN: number,
): SequenceEditorTree_SheetObject {
  let topSoFar = startTop
  let nSoFar = startN

  const updatedNode = {
    ...node,
    top: topSoFar,
    n: nSoFar,
  }

  topSoFar += node.nodeHeight
  nSoFar += 1

  const updatedChildren = node.children.map((child) => {
    const updatedChild = recalculateChildPositions(child, topSoFar, nSoFar)
    topSoFar = updatedChild.top + updatedChild.nodeHeight
    // For compound properties, also add their children's heights
    if (updatedChild.type === 'propWithChildren') {
      topSoFar += updatedChild.heightIncludingChildren - updatedChild.nodeHeight
    }
    nSoFar = updatedChild.n + 1
    return updatedChild
  })

  return {
    ...updatedNode,
    children: updatedChildren,
    heightIncludingChildren: topSoFar - updatedNode.top,
  }
}

function recalculateChildPositions(
  child: SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp,
  startTop: number,
  startN: number,
): SequenceEditorTree_PropWithChildren | SequenceEditorTree_PrimitiveProp {
  const updatedChild = {
    ...child,
    top: startTop,
    n: startN,
  }

  if (child.type === 'propWithChildren') {
    let topSoFar = startTop + child.nodeHeight
    let nSoFar = startN + 1

    const updatedGrandChildren = child.children.map((grandChild) => {
      const updatedGrandChild = recalculateChildPositions(
        grandChild,
        topSoFar,
        nSoFar,
      )
      topSoFar = updatedGrandChild.top + updatedGrandChild.nodeHeight
      // For compound properties, also add their children's heights
      if (updatedGrandChild.type === 'propWithChildren') {
        topSoFar +=
          updatedGrandChild.heightIncludingChildren -
          updatedGrandChild.nodeHeight
      }
      nSoFar = updatedGrandChild.n + 1
      return updatedGrandChild
    })

    return {
      ...updatedChild,
      children: updatedGrandChildren,
      heightIncludingChildren: topSoFar - updatedChild.top,
    } as SequenceEditorTree_PropWithChildren
  }

  return updatedChild
}
