import { render, screen } from '@testing-library/react'
import Navbar from '../components/Navbar'

describe('Navbar Component', () => {
  it('renders without crashing', () => {
    render(<Navbar />)
    // Basic test to ensure component renders
    expect(screen).toBeDefined()
  })
})
