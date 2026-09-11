import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PlacesNavLink from './PlacesNavLink.jsx'

describe('PlacesNavLink', () => {
  it('targets the breweries and venues discovery route', () => {
    const markup = renderToStaticMarkup(<PlacesNavLink />)
    expect(markup).toContain('/places')
    expect(markup).toContain('Breweries &amp; Venues')
  })
})
