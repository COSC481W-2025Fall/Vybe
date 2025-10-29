// TODO: Implement SongDetailsDialog component
// Props: song (object with song details), open, onOpenChange
// Should display song details in a dialog modal

export function SongDetailsDialog({ song, open, onOpenChange }) {
  if (!song) return null;
  
  return (
    <div className={`dialog ${open ? 'open' : ''}`}>
      <div className="dialog-content">
        <h2>{song.title}</h2>
        <p>{song.artist}</p>
        {/* TODO: Add more song details */}
      </div>
    </div>
  );
}

