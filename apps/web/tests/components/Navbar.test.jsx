import { render, screen } from '../utils/test-utils';
import Navbar from '../../components/Navbar';

describe('Navbar Component', () => {
  it('renders the Vybe brand', () => {
    render(<Navbar />);
    expect(screen.getByText('Vybe')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Playlist')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('has correct navigation structure', () => {
    render(<Navbar />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });
});
