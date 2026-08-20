import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import {
  defaultObservationDraft,
  loadBuyerVerified,
  loadCommunityObservation,
  persistCommunityObservation,
} from '@/data/buyerCommunityStorage'
import {
  isValidObservation,
  type ObservationAnswers,
  type ObservationFieldId,
} from '@/data/observationFields'
import {
  fetchCommunitySummary,
  upsertCommunityObservation,
  type CommunitySummary,
} from '@/lib/communityApi'

export function useCommunityObservation(propertyId: string) {
  const { ownerId } = useAuth()
  const stored = loadCommunityObservation(propertyId)
  const [draft, setDraft] = useState<ObservationAnswers>(() => defaultObservationDraft(propertyId))
  const [submitted, setSubmitted] = useState<ObservationAnswers | null>(() => stored?.answers ?? null)
  const [verified, setVerified] = useState(() => loadBuyerVerified(propertyId))
  const [summary, setSummary] = useState<CommunitySummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    const nextStored = loadCommunityObservation(propertyId)
    setSubmitted(nextStored?.answers ?? null)
    setDraft(nextStored?.answers ?? defaultObservationDraft(propertyId))
    setVerified(loadBuyerVerified(propertyId))
    void fetchCommunitySummary(propertyId).then((next) => {
      if (!next) return
      setSummary(next)
      if (next.myObservation) {
        setSubmitted(next.myObservation)
        setDraft(next.myObservation)
      }
      if (next.canContribute) setVerified(true)
    })
  }, [propertyId])

  useEffect(() => {
    refresh()
  }, [propertyId, ownerId, refresh])

  useEffect(() => {
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const onSiteOpen = verified || Boolean(summary?.canContribute)

  function setAnswer(fieldId: ObservationFieldId, optionId: string) {
    if (!onSiteOpen) return
    setDraft((prev) => ({ ...prev, [fieldId]: optionId }))
    setSaveError(null)
  }

  async function submit() {
    if (!onSiteOpen || !isValidObservation(draft) || saving) return false
    setSaving(true)
    setSaveError(null)
    persistCommunityObservation(propertyId, {
      answers: draft,
      submittedAt: new Date().toISOString(),
    })
    setSubmitted(draft)

    const result = await upsertCommunityObservation(propertyId, draft)
    setSaving(false)
    if (result.summary) {
      setSummary(result.summary)
      if (result.summary.myObservation) {
        setSubmitted(result.summary.myObservation)
        setDraft(result.summary.myObservation)
      }
      if (result.summary.canContribute) setVerified(true)
    }
    if (!result.ok && result.reason && result.reason !== 'local_only') {
      setSaveError('Could not save to the shared log. Your answers are stored on this device.')
      return false
    }
    return true
  }

  return {
    draft,
    submitted,
    onSiteOpen,
    summary,
    saving,
    saveError,
    setAnswer,
    submit,
    observationCount: summary?.observationCount ?? (submitted ? 1 : 0),
  }
}
