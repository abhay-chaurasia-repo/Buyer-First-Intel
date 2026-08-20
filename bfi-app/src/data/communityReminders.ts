/** In-app / local reminders to submit a Buyer Community observation after Presence Confirmed.
 *  Phone numbers are for sign-in OTP only — we do not send community SMS. */

import { canContributeOnSite } from './ownerScope'
import { notificationsSupported } from './visitReminders'

export { hasCommunityObservation } from './buyerCommunityStorage'

/** True for the whole 2-week window — including after an observation is already submitted. */
export function shouldNudgeCommunityContribute(propertyId: string) {
  return canContributeOnSite(propertyId)
}

/** One local notification after Presence Confirmed, only if the buyer already allowed alerts. */
export function notifyContributeAfterVerify(address: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    const note = new Notification('On-site observation unlocked', {
      body: `${address} — submit one structured observation in Buyer Community. The form stays open for 2 weeks even after you share. Phone near pin, not a tour.`,
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
