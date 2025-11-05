import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomePage } from '@/components/HomePage'
import { testAccessibility } from '@/test/test-utils'

// Mock hooks
let mockGroups = []
let mockCreateGroup = vi.fn()
let mockGroupsLoading = false
let mockGroupsError = null

let mockFriendsSongs = []
let mockCommunities = []
let mockSocialLoading = false
let mockSocialError = null

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups: mockGroups,
    createGroup: mockCreateGroup,
    loading: mockGroupsLoading,
    error: mockGroupsError
  })
}))

vi.mock('@/hooks/useSocial', () => ({
  useSocial: () => ({
    friendsSongsOfTheDay: mockFriendsSongs,
    communities: mockCommunities,
    loading: mockSocialLoading,
    error: mockSocialError
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGroups = []
    mockFriendsSongs = []
    mockCommunities = []
    mockGroupsLoading = false
    mockGroupsError = null
    mockSocialLoading = false
    mockSocialError = null
  })

  describe('Basic Rendering', () => {
    it('renders all main sections', () => {
      render(<HomePage />)

      expect(screen.getByText('My Groups')).toBeInTheDocument()
      expect(screen.getByText("Friends' Song of the Day")).toBeInTheDocument()
      expect(screen.getByText('Trending Communities')).toBeInTheDocument()
    })

    it('renders create group button', () => {
      render(<HomePage />)

      expect(screen.getByRole('button', { name: /Create Group/i })).toBeInTheDocument()
    })

    it('renders share song button', () => {
      render(<HomePage />)

      expect(screen.getByRole('button', { name: /Share Song/i })).toBeInTheDocument()
    })

    it('renders browse all communities button', () => {
      render(<HomePage />)

      expect(screen.getByRole('button', { name: /Browse All/i })).toBeInTheDocument()
    })
  })

  describe('Groups Section', () => {
    it('shows loading state when groups are loading', () => {
      mockGroupsLoading = true
      render(<HomePage />)

      // LoadingState component should render skeleton cards
      expect(screen.getByText('My Groups')).toBeInTheDocument()
    })

    it('displays groups when available', () => {
      mockGroups.push(
        {
          id: 'group1',
          name: 'Test Group 1',
          description: 'Description 1',
          memberCount: 5,
          songCount: 10,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'group2',
          name: 'Test Group 2',
          description: 'Description 2',
          memberCount: 3,
          songCount: 7,
          createdAt: '2024-01-02T00:00:00Z'
        }
      )

      render(<HomePage />)

      expect(screen.getByText('Test Group 1')).toBeInTheDocument()
      expect(screen.getByText('Test Group 2')).toBeInTheDocument()
      expect(screen.getByText('Description 1')).toBeInTheDocument()
      expect(screen.getByText('Description 2')).toBeInTheDocument()
    })

    it('shows empty state when no groups exist', () => {
      render(<HomePage />)

      expect(screen.getByText('No groups yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first group to start sharing music with friends')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Your First Group/i })).toBeInTheDocument()
    })

    it('displays error message when groups fail to load', () => {
      mockGroupsError = 'Failed to load groups'
      render(<HomePage />)

      expect(screen.getByText('Failed to load groups')).toBeInTheDocument()
    })

    it('opens create group dialog when create button is clicked', async () => {
      render(<HomePage />)

      const createButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })
    })

    it('creates group with form data', async () => {
      mockCreateGroup.mockResolvedValue({ id: 'new-group', name: 'New Group' })
      
      render(<HomePage />)

      const createButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/Group Name/i)
      const descriptionInput = screen.getByLabelText(/Description/i)
      const submitButton = screen.getByRole('button', { name: /Create Group/i })

      await userEvent.type(nameInput, 'My New Group')
      await userEvent.type(descriptionInput, 'My description')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateGroup).toHaveBeenCalledWith('My New Group', 'My description', false)
      })
    })

    it('handles create group error', async () => {
      mockCreateGroup.mockRejectedValue(new Error('Failed to create group'))
      
      render(<HomePage />)

      const createButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/Group Name/i)
      const submitButton = screen.getByRole('button', { name: /Create Group/i })

      await userEvent.type(nameInput, 'My New Group')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Failed to create group/)).toBeInTheDocument()
      })
    })

    it('validates required group name field', async () => {
      render(<HomePage />)

      const createButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(submitButton)

      // HTML5 validation should prevent submission
      await waitFor(() => {
        expect(mockCreateGroup).not.toHaveBeenCalled()
      })
    })

    it('handles group privacy toggle', async () => {
      render(<HomePage />)

      const createButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })

      const privacySwitch = screen.getByLabelText(/Public Group/i)
      const nameInput = screen.getByLabelText(/Group Name/i)
      const submitButton = screen.getByRole('button', { name: /Create Group/i })

      await userEvent.type(nameInput, 'Private Group')
      await userEvent.click(privacySwitch) // Toggle to private
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateGroup).toHaveBeenCalledWith('Private Group', '', true)
      })
    })
  })

  describe("Friends' Song of the Day Section", () => {
    it('shows loading state when songs are loading', () => {
      mockSocialLoading = true
      render(<HomePage />)

      expect(screen.getByText("Friends' Song of the Day")).toBeInTheDocument()
    })

    it('displays friends songs when available', () => {
      mockFriendsSongs.push(
        {
          id: 'song1',
          title: 'Song 1',
          artist: 'Artist 1',
          shared_by: 'Friend 1',
          shared_by_avatar: 'https://example.com/avatar1.jpg',
          shared_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'song2',
          title: 'Song 2',
          artist: 'Artist 2',
          shared_by: 'Friend 2',
          shared_at: '2024-01-01T13:00:00Z'
        }
      )

      render(<HomePage />)

      expect(screen.getByText('Song 1')).toBeInTheDocument()
      expect(screen.getByText('Artist 1')).toBeInTheDocument()
      expect(screen.getByText('Friend 1')).toBeInTheDocument()
    })

    it('shows empty state when no songs shared', () => {
      render(<HomePage />)

      expect(screen.getByText('No songs shared today')).toBeInTheDocument()
      expect(screen.getByText("Be the first to share your song of the day!")).toBeInTheDocument()
    })

    it('displays error message when songs fail to load', () => {
      mockSocialError = 'Failed to load songs'
      render(<HomePage />)

      expect(screen.getByText('Failed to load songs')).toBeInTheDocument()
    })

    it('opens share song dialog when button is clicked', async () => {
      render(<HomePage />)

      const shareButton = screen.getByRole('button', { name: /Share Song/i })
      await userEvent.click(shareButton)

      await waitFor(() => {
        // ShareSongDialog should open
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('opens song details dialog when song is clicked', async () => {
      mockFriendsSongs.push({
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        shared_by: 'Friend 1',
        shared_at: '2024-01-01T12:00:00Z'
      })

      render(<HomePage />)

      const songButton = screen.getByText('Song 1').closest('button')
      await userEvent.click(songButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('handles songs without avatar gracefully', () => {
      mockFriendsSongs.push({
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        shared_by: 'Friend 1',
        shared_at: '2024-01-01T12:00:00Z'
      })

      render(<HomePage />)

      expect(screen.getByText('Song 1')).toBeInTheDocument()
      expect(screen.getByText('Friend 1')).toBeInTheDocument()
    })

    it('handles songs without shared_at timestamp', () => {
      mockFriendsSongs.push({
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        shared_by: 'Friend 1'
      })

      render(<HomePage />)

      expect(screen.getByText('Song 1')).toBeInTheDocument()
    })
  })

  describe('Communities Section', () => {
    it('displays communities when available', () => {
      mockCommunities.push(
        {
          id: 'comm1',
          name: 'Community 1',
          description: 'Description 1',
          member_count: 1000,
          group_count: 5
        },
        {
          id: 'comm2',
          name: 'Community 2',
          description: 'Description 2',
          member_count: 2500,
          group_count: 10
        }
      )

      render(<HomePage />)

      expect(screen.getByText('Community 1')).toBeInTheDocument()
      expect(screen.getByText('Community 2')).toBeInTheDocument()
      expect(screen.getByText('Description 1')).toBeInTheDocument()
      expect(screen.getByText('Description 2')).toBeInTheDocument()
    })

    it('shows trending badge for communities with >2000 members', () => {
      mockCommunities.push({
        id: 'comm1',
        name: 'Trending Community',
        description: 'Description',
        member_count: 2500,
        group_count: 10
      })

      render(<HomePage />)

      expect(screen.getByText('Trending')).toBeInTheDocument()
    })

    it('does not show trending badge for communities with <=2000 members', () => {
      mockCommunities.push({
        id: 'comm1',
        name: 'Regular Community',
        description: 'Description',
        member_count: 1500,
        group_count: 5
      })

      render(<HomePage />)

      expect(screen.queryByText('Trending')).not.toBeInTheDocument()
    })

    it('opens communities dialog when browse all is clicked', async () => {
      render(<HomePage />)

      const browseButton = screen.getByRole('button', { name: /Browse All/i })
      await userEvent.click(browseButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('opens community detail dialog when community is clicked', async () => {
      mockCommunities.push({
        id: 'comm1',
        name: 'Community 1',
        description: 'Description',
        member_count: 1000,
        group_count: 5
      })

      render(<HomePage />)

      const communityButton = screen.getByText('Community 1').closest('button')
      await userEvent.click(communityButton)

      await waitFor(() => {
        expect(screen.getByText('Community 1')).toBeInTheDocument()
      })
    })

    it('displays member and group counts correctly', () => {
      mockCommunities.push({
        id: 'comm1',
        name: 'Community 1',
        description: 'Description',
        member_count: 1234,
        group_count: 42
      })

      render(<HomePage />)

      expect(screen.getByText('1,234 members')).toBeInTheDocument()
      expect(screen.getByText('42 groups')).toBeInTheDocument()
    })

    it('handles missing group_count gracefully', () => {
      mockCommunities.push({
        id: 'comm1',
        name: 'Community 1',
        description: 'Description',
        member_count: 1000
      })

      render(<HomePage />)

      expect(screen.getByText('0 groups')).toBeInTheDocument()
    })
  })

  describe('Integration Scenarios', () => {
    it('handles full workflow: create group, share song, browse communities', async () => {
      mockCreateGroup.mockResolvedValue({ id: 'new-group', name: 'New Group' })

      render(<HomePage />)

      // Create group
      const createButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/Group Name/i)
      await userEvent.type(nameInput, 'My Group')
      const submitButton = screen.getByRole('button', { name: /Create Group/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateGroup).toHaveBeenCalled()
      })

      // Share song
      const shareButton = screen.getByRole('button', { name: /Share Song/i })
      await userEvent.click(shareButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Browse communities
      const browseButton = screen.getByRole('button', { name: /Browse All/i })
      await userEvent.click(browseButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('handles navigation callback when provided', async () => {
      const mockNavigate = vi.fn()
      mockGroups.push({
        id: 'group1',
        name: 'Test Group',
        description: 'Description',
        memberCount: 5,
        songCount: 10,
        createdAt: '2024-01-01T00:00:00Z'
      })

      render(<HomePage onNavigate={mockNavigate} />)

      const groupCard = screen.getByText('Test Group').closest('div')
      await userEvent.click(groupCard)

      expect(mockNavigate).toHaveBeenCalledWith('groups', { groupId: 'group1' })
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<HomePage />)
      await testAccessibility(container)
    })

    it('has proper heading structure', () => {
      render(<HomePage />)

      const headings = screen.getAllByRole('heading', { level: 2 })
      expect(headings.length).toBeGreaterThan(0)
      expect(headings[0]).toHaveTextContent('My Groups')
    })

    it('has proper button roles and labels', () => {
      render(<HomePage />)

      expect(screen.getByRole('button', { name: /Create Group/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Share Song/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Browse All/i })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(<HomePage />)

      const createButton = screen.getByRole('button', { name: /Create Group/i })
      createButton.focus()
      expect(document.activeElement).toBe(createButton)

      await userEvent.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles very long group names gracefully', () => {
      mockGroups.push({
        id: 'group1',
        name: 'A'.repeat(100),
        description: 'Description',
        memberCount: 5,
        songCount: 10,
        createdAt: '2024-01-01T00:00:00Z'
      })

      render(<HomePage />)

      // Should truncate with CSS
      expect(screen.getByText(/^A+$/)).toBeInTheDocument()
    })

    it('handles missing descriptions gracefully', () => {
      mockGroups.push({
        id: 'group1',
        name: 'Test Group',
        memberCount: 5,
        songCount: 10,
        createdAt: '2024-01-01T00:00:00Z'
      })

      render(<HomePage />)

      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    it('handles zero counts gracefully', () => {
      mockGroups.push({
        id: 'group1',
        name: 'Empty Group',
        description: 'Description',
        memberCount: 0,
        songCount: 0,
        createdAt: '2024-01-01T00:00:00Z'
      })

      render(<HomePage />)

      expect(screen.getByText('0 members')).toBeInTheDocument()
      expect(screen.getByText('0 songs')).toBeInTheDocument()
    })

    it('handles large numbers correctly', () => {
      mockCommunities.push({
        id: 'comm1',
        name: 'Large Community',
        description: 'Description',
        member_count: 1234567,
        group_count: 9999
      })

      render(<HomePage />)

      expect(screen.getByText('1,234,567 members')).toBeInTheDocument()
      expect(screen.getByText('9,999 groups')).toBeInTheDocument()
    })
  })
})

