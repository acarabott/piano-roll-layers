export class NoteManager {
  constructor() {
    this.notes = [];
    this.currentNote;
  }

  addNote(note) {
    this.notes.push(note);
  }

  deleteNote(note) {
    if (this.notes.includes(note)) {
      this.notes.splice(this.notes.indexOf(note), 1);
    }
  }

  get notesWithCurrent() {
    const notes = this.notes.slice();
    if (this.currentNote !== undefined) { notes.push(this.currentNote); }
    return notes;
  }
}
