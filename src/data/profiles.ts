export type PlayerProfile = {
  id: string
  name: string
}

export type ProfileRegistry = {
  profiles: PlayerProfile[]
  activeProfileId: string
}

export const DEFAULT_PROFILE: PlayerProfile = { id: 'default', name: 'Joueur 1' }
export const PROFILES_KEY = 'globidoo.profiles.v1'
export const ACTIVE_PROFILE_KEY = 'globidoo.profile.active.v1'

export function profileStorageKey(baseKey: string, profileId: string) {
  return profileId === DEFAULT_PROFILE.id ? baseKey : `${baseKey}.${profileId}`
}

export function loadProfileRegistry(): ProfileRegistry {
  try {
    const saved = localStorage.getItem(PROFILES_KEY)
    const parsed = saved ? JSON.parse(saved) as PlayerProfile[] : []
    const profiles = parsed.filter((profile) => (
      typeof profile?.id === 'string'
      && typeof profile?.name === 'string'
      && profile.id.length > 0
      && profile.id.length <= 80
      && profile.name.trim().length > 0
      && profile.name.trim().length <= 30
    ))
    let requestedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY)
    const existingDefaultProfile = profiles.find((profile) => profile.id === DEFAULT_PROFILE.id)

    // Registries created before the neutral default profile used their first
    // entry for the base storage keys. Migrating that entry preserves progress.
    if (profiles.length && !existingDefaultProfile) {
      const previousDefaultId = profiles[0].id
      profiles[0] = DEFAULT_PROFILE
      if (requestedActiveId === previousDefaultId) requestedActiveId = DEFAULT_PROFILE.id
    }
    if (!profiles.length) profiles.push(DEFAULT_PROFILE)

    const activeProfileId = profiles.some((profile) => profile.id === requestedActiveId)
      ? requestedActiveId!
      : profiles[0].id

    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId)
    return { profiles, activeProfileId }
  } catch {
    return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id }
  }
}

export function createProfileId() {
  return `profile-${crypto.randomUUID()}`
}
