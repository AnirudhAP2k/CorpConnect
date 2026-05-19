/**
 * Sample test to verify Jest configuration
 */

import '@testing-library/jest-dom';

describe('Jest Configuration', () => {
    it('should run tests successfully', () => {
        expect(true).toBe(true)
    })

    it('should have access to testing-library matchers', () => {
        const element = document.createElement('div')
        element.textContent = 'Hello, World!'
        document.body.appendChild(element)

        expect(element).toBeInTheDocument()
        expect(element).toHaveTextContent('Hello, World!')
    })
})

/**
 * Example utility function test
 */
describe('Sample Utility Tests', () => {
    it('should perform basic arithmetic', () => {
        const sum = (a: number, b: number) => a + b
        expect(sum(2, 3)).toBe(5)
    })

    it('should handle string operations', () => {
        const greeting = (name: string) => `Hello, ${name}!`
        expect(greeting('World')).toBe('Hello, World!')
    })
})
