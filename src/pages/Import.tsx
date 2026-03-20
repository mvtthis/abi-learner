import { useState } from 'react'
import { ImportModal } from '@/components/ImportModal'

export function Import() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-bold text-white">Import</h2>

      <div className="space-y-3">
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div>
              <p className="text-sm font-semibold text-white">
                .txt Datei importieren
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tab-separiert: Frage → Antwort → Tags
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Format</h3>
        <div className="text-xs text-zinc-400 space-y-1 font-mono">
          <p className="text-zinc-600"># Metadaten (optional):</p>
          <p>#separator:tab</p>
          <p>#html:true</p>
          <p>#tags column:3</p>
          <p className="text-zinc-600 mt-2"># Karten:</p>
          <p>
            Frage<span className="text-zinc-600">[TAB]</span>Antwort
            <span className="text-zinc-600">[TAB]</span>tag1 tag2
          </p>
        </div>
      </div>

      <ImportModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
