import type {SequenceEditorTree_AllRowTypes} from './tree'

export function flattenSequenceEditorTree(
  node: SequenceEditorTree_AllRowTypes,
  acc: SequenceEditorTree_AllRowTypes[] = [],
): SequenceEditorTree_AllRowTypes[] {
  if (node.shouldRender) {
    acc.push(node)
  }

  // If the node is collapsed, we don't render its children
  // The 'sheet' type ignores collapsed state according to tree.ts
  const isCollapsed = 'isCollapsed' in node ? node.isCollapsed : false
  const shouldRecurse = node.type === 'sheet' || !isCollapsed

  if (shouldRecurse && 'children' in node) {
    for (const child of node.children) {
      flattenSequenceEditorTree(child, acc)
    }
  }

  return acc
}
