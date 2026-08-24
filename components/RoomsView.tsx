"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PencilSimpleIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Room } from "@/types";
import { endpoints } from "@/api/clients";

type RoomDraft = {
    roomNumber: string;
    status: Room["status"];
    monthlyRent: string;
    maxOccupancy: string;
    images: string;
    description: string;
};

const emptyDraft: RoomDraft = { roomNumber: "", status: "AVAILABLE", monthlyRent: "", maxOccupancy: "1", images: "", description: "" };

function draftFromRoom(room: Room): RoomDraft {
    return { roomNumber: room.roomNumber, status: room.status, monthlyRent: String(room.monthlyRent), maxOccupancy: String(room.maxOccupancy), images: room.images ?? "", description: room.description ?? "" };
}

const fallbackImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
];

function RoomCard({ room, onEdit }: { room: Room; onEdit: (room: Room) => void }) {
    const images = room.images?.split(",").map((image) => image.trim()).filter(Boolean) ?? [];
    const slideshowImages = images.length > 0 ? images : fallbackImages;
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        if (slideshowImages.length < 2) return;
        const timer = window.setInterval(() => setActiveImage((current) => (current + 1) % slideshowImages.length), 5000);
        return () => window.clearInterval(timer);
    }, [slideshowImages.length]);

    const moveImage = (direction: number) => setActiveImage((current) => (current + direction + slideshowImages.length) % slideshowImages.length);

    return (
        <article className="overflow-hidden border border-[#dcd9d1] bg-[#f8f7f3]">
            <div className="group relative aspect-video overflow-hidden bg-[#dedbd2]">
                <div className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500" style={{ backgroundImage: `url("${slideshowImages[activeImage]}")` }} role="img" aria-label={`Photo of room ${room.roomNumber}`} />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/45 to-transparent" />
                {slideshowImages.length > 1 && <>
                    <button type="button" onClick={() => moveImage(-1)} aria-label="Previous room photo" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><CaretLeftIcon size={18} weight="bold" /></button>
                    <button type="button" onClick={() => moveImage(1)} aria-label="Next room photo" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><CaretRightIcon size={18} weight="bold" /></button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-label="Room photo slides">{slideshowImages.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(index)} aria-label={`Show room photo ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === activeImage ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />)}</div>
                </>}
            </div>
            <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2.5"><h2 className="text-lg font-semibold text-[#202522]">Room {room.roomNumber}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${room.status === "AVAILABLE" ? "bg-[#dcecdf] text-[#397052]" : room.status === "OCCUPIED" ? "bg-[#eee4d6] text-[#94613a]" : "bg-[#f3dcd6] text-[#9d4937]"}`}>{room.status.toLowerCase()}</span></div>
                <p className="mt-2 text-sm text-[#707770]">₱{room.monthlyRent.toLocaleString()} / month · up to {room.maxOccupancy} {room.maxOccupancy === 1 ? "person" : "people"}</p>
                {room.description && <p className="mt-1 text-sm text-[#858b84]">{room.description}</p>}
                <button onClick={() => onEdit(room)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#cbc7bc] px-3 py-2 text-sm font-semibold text-[#202522] hover:border-[#202522] sm:w-fit"><PencilSimpleIcon /> Edit</button>
            </div>
        </article>
    );
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<RoomDraft>(emptyDraft);

    const loadRooms = () => {
        endpoints.rooms.getAll().then((response) => setRooms(response.data)).catch(() => setError("Could not load rooms. Check that the backend is running.")).finally(() => setLoading(false));
    };

    useEffect(() => { loadRooms(); }, []);

    const closeEditor = () => { setEditingId(null); setDraft(emptyDraft); };
    const updateDraft = (field: keyof RoomDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
    const openNewRoom = () => { setError(null); setEditingId(0); setDraft(emptyDraft); };
    const openEditRoom = (room: Room) => { setError(null); setEditingId(room.id); setDraft(draftFromRoom(room)); };

    const saveRoom = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        const payload = { ...draft, monthlyRent: Number(draft.monthlyRent), maxOccupancy: Number(draft.maxOccupancy) };
        const request = editingId ? endpoints.rooms.update(editingId, payload) : endpoints.rooms.create(payload);
        request.then((response) => {
            const savedRoom = response.data as Room;
            setRooms((current) => editingId ? current.map((room) => room.id === editingId ? savedRoom : room) : [...current, savedRoom]);
            closeEditor();
        }).catch(() => setError("Could not save this room. Check the details and try again.")).finally(() => setSaving(false));
    };

    if (loading) return <p className="text-sm text-[#707770]">Loading rooms...</p>;

    return (
        <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
                <div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d96c52] md:mb-2 md:text-xs">Property inventory</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">Rooms</h1><p className="mt-1.5 text-sm leading-6 text-[#707770] md:mt-2">Keep room details, pricing, and availability up to date.</p></div>
                <button onClick={openNewRoom} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#d96c52] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c55d45] md:w-fit"><PlusIcon weight="bold" /> Add room</button>
            </div>
            {error && <p role="alert" className="border-l-2 border-[#d96c52] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">{error}</p>}
            {editingId !== null && <form onSubmit={saveRoom} className="border-t-2 border-[#202522] bg-[#f8f7f3] p-4 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-base font-semibold text-[#202522]">{editingId ? "Edit room" : "Add a room"}</h2><button type="button" onClick={closeEditor} aria-label="Close room editor" className="p-1 text-[#707770] hover:text-[#202522]"><XIcon size={20} /></button></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm font-medium text-[#202522]">Room number<input required value={draft.roomNumber} onChange={(event) => updateDraft("roomNumber", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]" /></label>
                    <label className="text-sm font-medium text-[#202522]">Status<select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"><option value="AVAILABLE">Available</option><option value="OCCUPIED">Occupied</option><option value="MAINTENANCE">Maintenance</option></select></label>
                    <label className="text-sm font-medium text-[#202522]">Monthly rent<input required min="0" type="number" value={draft.monthlyRent} onChange={(event) => updateDraft("monthlyRent", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]" /></label>
                    <label className="text-sm font-medium text-[#202522]">Max occupancy<input required min="1" type="number" value={draft.maxOccupancy} onChange={(event) => updateDraft("maxOccupancy", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]" /></label>
                    <label className="text-sm font-medium text-[#202522] md:col-span-2">Image references<input value={draft.images} onChange={(event) => updateDraft("images", event.target.value)} placeholder="Comma-separated URLs" className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]" /></label>
                    <label className="text-sm font-medium text-[#202522] md:col-span-2 lg:col-span-3">Description<textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]" /></label>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 md:flex-row md:justify-end"><button type="button" onClick={closeEditor} className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]">Cancel</button><button disabled={saving} className="rounded-md bg-[#202522] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : editingId ? "Save changes" : "Create room"}</button></div>
            </form>}
            <div className="grid gap-5 md:grid-cols-2">{rooms.length === 0 ? <p className="py-10 text-center text-sm text-[#707770] md:col-span-2">No rooms yet. Add your first room to get started.</p> : rooms.map((room) => <RoomCard key={room.id} room={room} onEdit={openEditRoom} />)}</div>
        </div>
    );
}