import { expect, it } from 'vitest'
import { renderDemoAvatar } from './demo-avatar'
it('renders a persistent, distinct SVG without external API availability', () => {
    const first = renderDemoAvatar('demo-1')
    expect(first).toContain('<svg')
    expect(renderDemoAvatar('demo-1')).toBe(first)
    expect(renderDemoAvatar('demo-2')).not.toBe(first)
    expect(() => renderDemoAvatar('../private')).toThrow()
})
