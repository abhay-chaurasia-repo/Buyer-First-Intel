export const ATTOM_LAZY_PACKAGES = {
  'tax-history': {
    attomPackage: 'assessmenthistory',
    path: 'assessmenthistory/detail',
    version: 'v1.0.0' as const,
  },
  'sales-history': {
    attomPackage: 'saleshistory',
    path: 'saleshistory/expandedhistory',
    version: 'v1.0.0' as const,
  },
  schools: {
    attomPackage: 'detailwithschools',
    path: 'property/detailwithschools',
    version: 'v4' as const,
  },
} as const

export type AttomLazySurface = keyof typeof ATTOM_LAZY_PACKAGES
export type AttomPackageName = (typeof ATTOM_LAZY_PACKAGES)[AttomLazySurface]['attomPackage']

export function isAttomLazySurface(value: string): value is AttomLazySurface {
  return value in ATTOM_LAZY_PACKAGES
}
