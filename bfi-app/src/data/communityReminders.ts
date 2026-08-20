/** In-app / local reminders to contribute Buyer Community labels after Presence Confirmed.
 *  Phone numbers are for sign-in OTP only — we do not send community SMS. */

import { loadBuyerVoteState } from './buyerCommunityStorage'
import { canContributeOnSite } from './ownerScope'
import { notificationsSupported } from './visitReminders'

export function hasCommunityVotes(propertyId: string) {
  return loadBuyerVoteState(propertyId).myVotes.length > 0
}

/** True for the whole 2-week window — including after labels are already shared. */
export function shouldNudgeCommunityContribute(propertyId: string) {
  return canContributeOnSite(propertyId)
}

/** One local notification after Presence Confirmed, only if the buyer already allowed alerts. */
export function notifyContributeAfterVerify(address: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    const note = new Notification('On-site labels unlocked', {
      body: `${address} — add or update Plus/Watch in Buyer Community. Labeling stays open for 2 weeks even after you share. Phone near pin, not a tour.`,
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
