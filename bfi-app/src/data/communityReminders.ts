/** In-app / local reminders to contribute Buyer Community labels after GPS Verify.
 *  Phone numbers are for sign-in OTP only — we do not send community SMS. */

import { loadBuyerVoteState } from './buyerCommunityStorage'
import { loadGpsVerified } from './ownerScope'
import { notificationsSupported } from './visitReminders'

export function hasCommunityVotes(propertyId: string) {
  return loadBuyerVoteState(propertyId).myVotes.length > 0
}

export function shouldNudgeCommunityContribute(propertyId: string) {
  return loadGpsVerified(propertyId) && !hasCommunityVotes(propertyId)
}

/** One local notification after a successful Verify, only if the buyer already allowed alerts. */
export function notifyContributeAfterVerify(address: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    const note = new Notification('On-site labels unlocked', {
      body: `${address} — add a Plus or Watch in Buyer Community. Unlocked for 2 weeks.`,
      tag: `bfi-contribute-${address}`,
    })
    note.onclick = () => {
      window.focus()
      note.close()
    }
    return true
  } catch {
    return false
  }
}
