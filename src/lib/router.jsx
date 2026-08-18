import {
  Children,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

const RouterContext = createContext(null)

const readLocation = () => ({
  pathname: window.location.pathname || '/',
  search: window.location.search,
  hash: window.location.hash,
  state: window.history.state
})

const normaliseInternalTarget = (target) => {
  const value = typeof target === 'string' ? target : target?.pathname
  if (!value) return '/'

  const url = new URL(value, window.location.origin)
  if (url.origin !== window.location.origin) {
    throw new Error('Navigation targets must use the current origin.')
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export const BrowserRouter = ({ children }) => {
  const [location, setLocation] = useState(readLocation)

  useEffect(() => {
    const handlePopState = () => setLocation(readLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (target, options = {}) => {
    if (typeof target === 'number') {
      window.history.go(target)
      return
    }

    const href = normaliseInternalTarget(target)
    const method = options.replace ? 'replaceState' : 'pushState'
    window.history[method](options.state ?? null, '', href)
    setLocation(readLocation())
    window.scrollTo({ top: 0, left: 0 })
  }

  const value = useMemo(
    () => ({ location, navigate, params: {} }),
    [location]
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

const useRouter = () => {
  const router = useContext(RouterContext)
  if (!router) throw new Error('Router hooks must be used inside BrowserRouter.')
  return router
}

export const useLocation = () => useRouter().location
export const useNavigate = () => useRouter().navigate
export const useParams = () => useRouter().params

export const useSearchParams = () => {
  const { location, navigate } = useRouter()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const setSearchParams = (next, options) => {
    const value = next instanceof URLSearchParams ? next : new URLSearchParams(next)
    navigate(`${location.pathname}?${value.toString()}`, options)
  }
  return [searchParams, setSearchParams]
}

const matchPath = (pattern, pathname) => {
  if (pattern === '*') return {}
  if (pattern === '/') return pathname === '/' ? {} : null

  const patternParts = pattern.replace(/^\/|\/$/g, '').split('/')
  const pathParts = pathname.replace(/^\/|\/$/g, '').split('/')
  if (patternParts.length !== pathParts.length) return null

  const params = {}
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index]
    const actual = pathParts[index]
    if (expected.startsWith(':')) {
      try {
        params[expected.slice(1)] = decodeURIComponent(actual)
      } catch {
        return null
      }
    } else if (expected !== actual) {
      return null
    }
  }
  return params
}

export const Routes = ({ children }) => {
  const router = useRouter()
  for (const child of Children.toArray(children)) {
    const params = matchPath(child.props.path, router.location.pathname)
    if (params !== null) {
      return (
        <RouterContext.Provider value={{ ...router, params }}>
          {child.props.element}
        </RouterContext.Provider>
      )
    }
  }
  return null
}

export const Route = () => null

export const Navigate = ({ to, replace = false, state = null }) => {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(to, { replace, state })
  }, [navigate, replace, state, to])
  return null
}

export const Link = ({ to, replace = false, state = null, onClick, target, ...props }) => {
  const navigate = useNavigate()
  const href = normaliseInternalTarget(to)

  const handleClick = (event) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      target === '_blank'
    ) {
      return
    }
    event.preventDefault()
    navigate(href, { replace, state })
  }

  return <a {...props} href={href} target={target} onClick={handleClick} />
}

export const NavLink = ({ to, end = false, className, children, ...props }) => {
  const { pathname } = useLocation()
  const href = normaliseInternalTarget(to)
  const targetPath = new URL(href, window.location.origin).pathname
  const isActive = end
    ? pathname === targetPath
    : pathname === targetPath || pathname.startsWith(`${targetPath}/`)

  return (
    <Link
      {...props}
      to={href}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className({ isActive }) : className}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </Link>
  )
}