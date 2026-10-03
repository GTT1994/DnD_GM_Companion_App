// A small plugin for the Markdown renderer: turns dice in the text ("8d6", "2d4 + 2") into links
// with addresses like "#roll:8d6", which Markdown.tsx shows as buttons that roll in the dice tray.
// Markdown is read into a tree of nodes (paragraphs, tables, text…); this walks the tree and
// splits each text node around the dice.

import type { Parent, PhrasingContent, Root, RootContent } from 'mdast'
import { splitDiceText } from './diceRoller'

export const ROLL_PREFIX = '#roll:'

function splitNode(node: Parent) {
  node.children = node.children.flatMap((child: RootContent): RootContent[] => {
    if (child.type === 'text') {
      return splitDiceText(child.value).map((part): PhrasingContent =>
        typeof part === 'string'
          ? { type: 'text', value: part }
          : { type: 'link', url: ROLL_PREFIX + encodeURIComponent(part.dice), children: [{ type: 'text', value: part.dice }] })
    }
    // Leave existing links alone; look inside everything else (paragraphs, lists, tables, bold…).
    if (child.type !== 'link' && 'children' in child) splitNode(child)
    return [child]
  }) as typeof node.children
}

export function remarkDice() {
  return (tree: Root) => splitNode(tree)
}
