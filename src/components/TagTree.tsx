import { useMemo, useState } from 'react'

interface TagTreeProps {
  tags: string[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}

interface TreeNode {
  name: string
  fullPath: string
  children: Map<string, TreeNode>
  count: number
}

function buildTree(tags: string[]): TreeNode {
  const root: TreeNode = {
    name: '',
    fullPath: '',
    children: new Map(),
    count: 0,
  }

  for (const tag of tags) {
    const parts = tag.split('::')
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const fullPath = parts.slice(0, i + 1).join('::')
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          fullPath,
          children: new Map(),
          count: 0,
        })
      }
      node = node.children.get(part)!
      node.count++
    }
  }

  return root
}

function TreeItem({
  node,
  selectedTags,
  onToggle,
  depth,
}: {
  node: TreeNode
  selectedTags: string[]
  onToggle: (tag: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = node.children.size > 0
  const isSelected = selectedTags.some(
    (t) =>
      t === node.fullPath || t.startsWith(node.fullPath + '::')
  )

  return (
    <div>
      <button
        onClick={() => {
          onToggle(node.fullPath)
          if (hasChildren && !expanded) setExpanded(true)
        }}
        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
          isSelected
            ? 'bg-blue-600/20 text-blue-400'
            : 'text-zinc-400 hover:bg-zinc-800/50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="text-zinc-500 w-4 text-center cursor-pointer"
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="capitalize">{node.name}</span>
        <span className="text-zinc-600 text-xs ml-auto">{node.count}</span>
      </button>
      {expanded &&
        Array.from(node.children.values()).map((child) => (
          <TreeItem
            key={child.fullPath}
            node={child}
            selectedTags={selectedTags}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

export function TagTree({ tags, selectedTags, onToggle }: TagTreeProps) {
  const tree = useMemo(() => buildTree(tags), [tags])

  if (tags.length === 0) {
    return (
      <p className="text-zinc-600 text-sm px-3 py-2">Keine Tags vorhanden</p>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onToggle('')}
        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
          selectedTags.length === 0
            ? 'bg-blue-600/20 text-blue-400'
            : 'text-zinc-400 hover:bg-zinc-800/50'
        }`}
      >
        Alle Karten
      </button>
      {Array.from(tree.children.values()).map((child) => (
        <TreeItem
          key={child.fullPath}
          node={child}
          selectedTags={selectedTags}
          onToggle={onToggle}
          depth={0}
        />
      ))}
    </div>
  )
}
