export class NoteManager {
  constructor() {
    this.notes = [];
    this.previewNote = undefined;
  }

  addNote(note) {
    this.notes.push(note);
  }

  deleteNote(note) {
    if (this.notes.includes(note)) {
      this.notes.splice(this.notes.indexOf(note), 1);
    }
  }

  get previewing() {
    return this.previewNote !== undefined;
  }
}
