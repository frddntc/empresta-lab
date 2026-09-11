import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom não implementa scrollIntoView (usado pelo auto-scroll do chat).
Element.prototype.scrollIntoView = vi.fn()
