import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, Inbox, Loader2, ListTodo, Repeat, Send, Sparkles, Trash2 } from 'lucide-react'
import { EmptyState, IconButton, Textarea } from '../../../design/primitives'
import {
  createQuickNote,
  deleteQuickNote,
  listUntriagedNotes,
  markNoteTriaged,
} from '../../../db/repositories/quickNotes'
import { useTaskFormStore } from '../../../features/tasks/taskFormStore'
import { useHabitFormStore } from '../../../features/habits/habitFormStore'
import { useCaptureRequestStore } from '../../shortcuts/captureRequestStore'
import { useAiAvailable } from '../../../features/ai/useAiAvailable'
import { AiError, recordAiUsage } from '../../../features/ai/errors'
import { getOrCreateSettings } from '../../../db/repositories/settings'
import { todayKey } from '../../../lib/dates'
import { useToastStore } from '../../../lib/toastStore'
import type { QuickNote } from '../../../db/types'

export function CapturePanel() {
  const [text, setText] = useState('')
  const notes = useLiveQuery(() => listUntriagedNotes(), [])
  const openTaskCreate = useTaskFormStore((s) => s.openCreate)
  const openHabitCreate = useHabitFormStore((s) => s.openCreate)
  const requestId = useCaptureRequestStore((s) => s.requestId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { available: aiAvailable } = useAiAvailable()
  const [parsingId, setParsingId] = useState<number | null>(null)
  const push = useToastStore((s) => s.push)

  useEffect(() => {
    if (requestId > 0) textareaRef.current?.focus()
  }, [requestId])

  const submit = async () => {
    if (!text.trim()) return
    try {
      await createQuickNote(text)
      setText('')
    } catch {
      push({ title: 'No se pudo guardar la nota', variant: 'error' })
    }
  }

  const toTask = async (note: QuickNote) => {
    openTaskCreate({ title: note.text })
    await markNoteTriaged(note.id!)
  }

  const toHabit = async (note: QuickNote) => {
    openHabitCreate(note.text)
    await markNoteTriaged(note.id!)
  }

  const toTaskWithAi = async (note: QuickNote) => {
    setParsingId(note.id!)
    try {
      const settings = await getOrCreateSettings()
      const apiKey = settings.claudeApiKey?.trim()
      if (!apiKey) return
      const { parseQuickCapture } = await import('../../../features/ai/prompts')
      const parsed = await parseQuickCapture(apiKey, note.text, todayKey())
      void recordAiUsage(settings)
      openTaskCreate({
        title: parsed.title,
        scheduledDate: parsed.scheduledDate,
        energy: parsed.energy,
        estimateMin: parsed.estimateMin,
      })
      await markNoteTriaged(note.id!)
    } catch (err) {
      push({ title: 'No se pudo interpretar la nota', description: err instanceof AiError ? err.message : undefined })
    } finally {
      setParsingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Apunta cualquier cosa…"
          rows={3}
          className="resize-none"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-text-faint">Enter para guardar</span>
          <IconButton label="Guardar" onClick={submit} className="h-6 w-6">
            <Send size={12} strokeWidth={2} />
          </IconButton>
        </div>
      </div>

      {notes && notes.length > 0 && (
        <ul className="space-y-2 border-t border-border pt-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-surface px-2 py-1.5">
              <p className="whitespace-pre-wrap break-words text-xs text-text">{note.text}</p>
              <div className="mt-1.5 flex items-center gap-0.5 border-t border-border pt-1.5">
                <IconButton label="Convertir en tarea" onClick={() => toTask(note)} className="h-6 w-6">
                  <ListTodo size={12} strokeWidth={2} />
                </IconButton>
                <IconButton label="Convertir en hábito" onClick={() => toHabit(note)} className="h-6 w-6">
                  <Repeat size={12} strokeWidth={2} />
                </IconButton>
                {aiAvailable && (
                  <IconButton
                    label="Convertir en tarea con IA"
                    onClick={() => toTaskWithAi(note)}
                    disabled={parsingId === note.id}
                    className="h-6 w-6"
                  >
                    {parsingId === note.id ? (
                      <Loader2 size={12} strokeWidth={2} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} strokeWidth={2} />
                    )}
                  </IconButton>
                )}
                <IconButton
                  label="Descartar (guardar sin convertir)"
                  onClick={() => markNoteTriaged(note.id!)}
                  className="h-6 w-6"
                >
                  <Archive size={12} strokeWidth={2} />
                </IconButton>
                <IconButton
                  label="Eliminar"
                  onClick={() => deleteQuickNote(note.id!)}
                  className="ml-auto h-6 w-6 hover:text-danger"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {notes?.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Sin notas por triar"
          description="Lo que apuntes arriba espera aquí a que lo conviertas en tarea, hábito, o lo descartes."
          className="p-4"
        />
      )}
    </div>
  )
}
