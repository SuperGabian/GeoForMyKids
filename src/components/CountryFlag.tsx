const flagAssets = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const flagUrlByIso = Object.fromEntries(Object.entries(flagAssets).map(([path, url]) => [
  path.slice(path.lastIndexOf('/') + 1, -4).toUpperCase(),
  url,
]))

type CountryFlagProps = {
  iso2: string
  name?: string
  className?: string
  decorative?: boolean
}

export function CountryFlag({ iso2, name, className = '', decorative = false }: CountryFlagProps) {
  const normalizedIso = iso2.toUpperCase()
  const classes = ['country-flag', className]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={classes}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Drapeau de ${name ?? normalizedIso}`}
      data-country-flag={normalizedIso}
      style={{ backgroundImage: `url("${flagUrlByIso[normalizedIso]}")` }}
    />
  )
}
