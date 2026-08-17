/** Expand informal street tokens so Census / ATTOM / OSM can match. */

const STREET_TOKEN_EXPAND: Record<string, string> = {
  pk: 'Park',
  pkwy: 'Parkway',
  hwy: 'Hwy',
  blvd: 'Blvd',
  ave: 'Ave',
  av: 'Ave',
  ln: 'Ln',
  ct: 'Ct',
  cir: 'Cir',
  ter: 'Ter',
  terr: 'Ter',
  pl: 'Pl',
  rd: 'Rd',
  trl: 'Trl',
  cv: 'Cv',
  xing: 'Crossing',
}

export function expandStreetLine(street: string): string {
  return street
    .trim()
    .split(/\s+/)
    .map((token, index) => {
      if (index === 0 && /^\d/.test(token)) return token
      const key = token.toLowerCase().replace(/\./g, '')
      return STREET_TOKEN_EXPAND[key] || token
    })
    .join(' ')
}

export function expandAddressQuery(query: string): string {
  const parts = query.split(',')
  if (parts.length === 0) return query.trim()
  const street = expandStreetLine(parts[0] || '')
  const rest = parts.slice(1).map((part) => part.trim())
  return [street, ...rest].filter(Boolean).join(', ')
}

export function addressQueryVariants(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const expanded = expandAddressQuery(trimmed)
  return expanded === trimmed ? [trimmed] : [trimmed, expanded]
}

const US_STATE = /^(A[LKZR]|C[AOT]|D[EC]|F[LM]|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$/i

function titleCaseWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((token) =>
      /^(NE|NW|SE|SW)$/i.test(token)
        ? token.toUpperCase()
        : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
    )
    .join(' ')
}

export type TypedUsAddress = {
  street: string
  city: string
  state: string
  zipCode: string
  formatted: string
}

/** Parse a buyer-typed line like "2212 Fern Park Drive, Chamblee, GA 30341". */
export function parseTypedUsAddress(query: string): TypedUsAddress | null {
  const expanded = expandAddressQuery(query)
  const parts = expanded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  const street = parts[0]!
  if (!/^\d+[A-Za-z]?\s+\S+/.test(street)) return null

  let city = ''
  let state = ''
  let zipCode = ''

  if (parts.length >= 3) {
    city = titleCaseWords(parts[1]!)
    const stateZip = parts[2]!.match(/^([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?$/)
    if (!stateZip) return null
    state = stateZip[1]!.toUpperCase()
    zipCode = stateZip[2] || ''
  } else {
    const cityState = parts[1]!.match(/^(.+?)\s+([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?$/)
    if (!cityState) return null
    city = titleCaseWords(cityState[1]!)
    state = cityState[2]!.toUpperCase()
    zipCode = cityState[3] || ''
  }

  if (!city || !US_STATE.test(state)) return null
  const formatted = zipCode ? `${street}, ${city}, ${state} ${zipCode}` : `${street}, ${city}, ${state}`
  return { street, city, state, zipCode, formatted }
}

export function streetLineVariants(street: string): string[] {
  const values = [street]
  if (/\bDrive$/i.test(street)) values.push(street.replace(/\bDrive$/i, 'Dr'))
  if (/\bDr$/i.test(street)) values.push(street.replace(/\bDr$/i, 'Drive'))
  return [...new Set(values)]
}

export function address2Variants(address2: string): string[] {
  const values = [address2]
  const strippedZip = address2.replace(/\s+\d{5}(?:-\d{4})?$/, '').trim()
  if (strippedZip && strippedZip !== address2) values.push(strippedZip)
  return [...new Set(values)]
}

export function splitAddressQuery(query: string): { address1: string; address2: string } | null {
  const expanded = expandAddressQuery(query)
  const parts = expanded
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  const address1 = parts[0]!
  if (!/^\d/.test(address1)) return null
  return { address1, address2: parts.slice(1).join(', ') }
}
