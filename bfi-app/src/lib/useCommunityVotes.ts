import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import {
  loadBuyerVerified,
  loadBuyerVoteState,
  persistBuyerVoteState,
  type BuyerVoteState,
} from '@/data/buyerCommunityStorage'
import { labelById, labelRequiresVisit } from '@/data/buyerCommunityLabels'
import {
  displayedVoteCount,
  fetchCommunitySummary,
  optimisticToggleVotes,
  toggleCommunityVote,
  type CommunitySummary,
} from '@/lib/communityApi'

export function useCommunityVotes(propertyId: string) {
  const { ownerId } = useAuth()
  const [voteState, setVoteState] = useState<BuyerVoteState>(() => loadBuyerVoteState(propertyId))
  const [verified, setVerified] = useState(() => loadBuyerVerified(propertyId))
  const [summary, setSummary] = useState<CommunitySummary | null>(null)

  const refresh = useCallback(() => {
    setVoteState(loadBuyerVoteState(propertyId))
    setVerified(loadBuyerVerified(propertyId))
    void fetchCommunitySummary(propertyId).then((next) => {
      if (!next) return
      setSummary(next)
      setVoteState(loadBuyerVoteState(propertyId))
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

  function voteCount(labelId: string) {
    return displayedVoteCount(labelId, voteState.myVotes, summary)
  }

  async function toggleVote(labelId: string) {
    const label = labelById(labelId)
    if (!label) return
    if (labelRequiresVisit(label) && !onSiteOpen) return

    const next = optimisticToggleVotes(voteState.myVotes, labelId)
    const optimistic: BuyerVoteState = { myVotes: next.myVotes, localBoosts: {} }
    setVoteState(optimistic)
    persistBuyerVoteState(propertyId, optimistic)

    const result = await toggleCommunityVote(propertyId, labelId)
    if (result.summary) {
      setSummary(result.summary)
      setVoteState(loadBuyerVoteState(propertyId))
      if (result.summary.canContribute) setVerified(true)
    }
  }

  return {
    voteState,
    onSiteOpen,
    summary,
    voteCount,
    toggleVote,
  }
}
