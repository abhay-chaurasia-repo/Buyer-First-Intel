/** Fixed on-site observation form. One record per buyer per property. No free text. */

export type ObservationFieldId = 'noise' | 'parking' | 'basement' | 'moisture'

export type ObservationOption = {
  id: string
  label: string
}

export type ObservationField = {
  id: ObservationFieldId
  title: string
  options: ObservationOption[]
}

export type ObservationAnswers = Record<ObservationFieldId, string>

export const OBSERVATION_FIELDS: ObservationField[] = [
  {
    id: 'noise',
    title: 'Noise during visit',
    options: [
      { id: 'none', label: 'None observed' },
      { id: 'moderate', label: 'Moderate' },
      { id: 'significant', label: 'Significant' },
      { id: 'not_evaluated', label: 'Not evaluated' },
    ],
  },
  {
    id: 'parking',
    title: 'Parking',
    options: [
      { id: 'easy', label: 'Easy' },
      { id: 'limited', label: 'Limited' },
      { id: 'difficult', label: 'Difficult' },
      { id: 'not_evaluated', label: 'Not evaluated' },
    ],
  },
  {
    id: 'basement',
    title: 'Basement',
    options: [
      { id: 'finished', label: 'Finished' },
      { id: 'partially_finished', label: 'Partially finished' },
      { id: 'unfinished', label: 'Unfinished' },
      { id: 'not_viewed', label: 'Not viewed' },
    ],
  },
  {
    id: 'moisture',
    title: 'Moisture or musty odor',
    options: [
      { id: 'observed', label: 'Observed' },
      { id: 'not_observed', label: 'Not observed' },
      { id: 'not_evaluated', label: 'Not evaluated' },
    ],
  },
]

export function emptyObservation(): ObservationAnswers {
  return {
    noise: 'not_evaluated',
    parking: 'not_evaluated',
    basement: 'not_viewed',
    moisture: 'not_evaluated',
  }
}

export function observationFieldById(fieldId: ObservationFieldId) {
  return OBSERVATION_FIELDS.find((field) => field.id === fieldId)
}

export function optionLabel(fieldId: ObservationFieldId, optionId: string) {
  return observationFieldById(fieldId)?.options.find((option) => option.id === optionId)?.label
}

export function isValidObservation(answers: ObservationAnswers) {
  return OBSERVATION_FIELDS.every((field) =>
    field.options.some((option) => option.id === answers[field.id]),
  )
}

export function parseObservationAnswers(raw: unknown): ObservationAnswers | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const next = emptyObservation()
  for (const field of OBSERVATION_FIELDS) {
    const value = record[field.id]
    if (typeof value !== 'string') return null
    if (!field.options.some((option) => option.id === value)) return null
    next[field.id] = value
  }
  return next
}

export function observationLines(answers: ObservationAnswers) {
  return OBSERVATION_FIELDS.map((field) => ({
    fieldId: field.id,
    title: field.title,
    value: optionLabel(field.id, answers[field.id]) ?? answers[field.id],
  }))
}
