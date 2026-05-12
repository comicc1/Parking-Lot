import os
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import modal

app = modal.App("note-taking-app")

class Note(BaseModel):
    id: Optional[int] = None
    title: str
    content: str

notes_db: Dict[int, Note] = {}
next_id = 1

web_app = FastAPI()

@web_app.get("/")
def read_root():
    return {"message": "Welcome to the Notes API. Visit /notes for the data."}

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@web_app.get("/notes", response_model=List[Note])
def list_notes():
    return list(notes_db.values())

@web_app.post("/notes", response_model=Note)
def create_note(note: Note):
    global next_id
    note_id = next_id
    next_id += 1
    new_note = Note(id=note_id, title=note.title, content=note.content)
    notes_db[note_id] = new_note
    return new_note

@web_app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, note: Note):
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    updated_note = Note(id=note_id, title=note.title, content=note.content)
    notes_db[note_id] = updated_note
    return updated_note

@web_app.delete("/notes/{note_id}")
def delete_note(note_id: int):
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    del notes_db[note_id]
    return {"message": "Note deleted"}

@app.function(
    image=modal.Image.debian_slim().pip_install("fastapi", "pydantic")
)
@modal.asgi_app()
def fastapi_app():
    return web_app
