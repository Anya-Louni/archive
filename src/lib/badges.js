export const BADGE_DEFINITIONS = [
  {
    id: 'First Case',
    description: 'Filed their first case to the archive',
    color: '#4d6b53',
    bg: 'rgba(77,107,83,0.13)',
    border: '#4d6b53',
  },
  {
    id: 'Investigator',
    description: 'Submitted 5+ community analyses',
    color: '#55697a',
    bg: 'rgba(85,105,122,0.13)',
    border: '#55697a',
  },
  {
    id: 'Archivist',
    description: 'Posted 10+ artifacts to the archive',
    color: '#7a4f4b',
    bg: 'rgba(122,79,75,0.13)',
    border: '#7a4f4b',
  },
  {
    id: 'Curator',
    description: 'Created and curated a collection',
    color: '#6d5a45',
    bg: 'rgba(109,90,69,0.13)',
    border: '#6d5a45',
  },
  {
    id: 'Veteran',
    description: 'Member of the archive for 6+ months',
    color: '#80513b',
    bg: 'rgba(128,81,59,0.12)',
    border: '#80513b',
  },
  {
    id: 'Verified',
    description: 'Identity verified by archive staff',
    color: '#a12a23',
    bg: 'rgba(161,42,35,0.1)',
    border: '#a12a23',
  },
  {
    id: 'Top Analyst',
    description: 'An analysis received 10+ community upvotes',
    color: '#2e5b8a',
    bg: 'rgba(46,91,138,0.1)',
    border: '#2e5b8a',
  },
  {
    id: 'Contributor',
    description: 'Made 25+ total contributions across the archive',
    color: '#5d3828',
    bg: 'rgba(93,56,40,0.12)',
    border: '#5d3828',
  },
]

export const BADGE_IDS = BADGE_DEFINITIONS.map((b) => b.id)

export function getBadgeDef(label) {
  return BADGE_DEFINITIONS.find((b) => b.id === label) ?? null
}
