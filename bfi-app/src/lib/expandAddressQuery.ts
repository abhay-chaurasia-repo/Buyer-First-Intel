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
