import NoteCard from './NoteCard';
import { Note } from '../api/client';

interface Props {
    notes: Note[];
}

export default function NoteGrid({ notes }: Props) {
    if (!notes || notes.length === 0) {
        return null;
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20
        }}>
            {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
            ))}
        </div>
    );
}