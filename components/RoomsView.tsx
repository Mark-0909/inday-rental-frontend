"use client";

import React, { ChangeEvent, FormEvent, useEffect, useState, useRef, useCallback } from "react";
import { CaretLeftIcon, CaretRightIcon, FileImageIcon, PencilSimpleIcon, PlusIcon, TrashIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { Room } from "@/types";
import { endpoints } from "@/api/clients";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";

type RoomDraft = {
    roomNumber: string;
    status: Room["status"];
    monthlyRent: string;
    maxOccupancy: string;
    description: string;
};

type RoomImage = { id: string; url: string; file?: File; saved?: boolean };

const emptyDraft: RoomDraft = { roomNumber: "", status: "AVAILABLE", monthlyRent: "", maxOccupancy: "1", description: "" };

function draftFromRoom(room: Room): RoomDraft {
    return { roomNumber: room.roomNumber, status: room.status, monthlyRent: String(room.monthlyRent), maxOccupancy: String(room.maxOccupancy), description: room.description ?? "" };
}

function imageUrls(value: unknown) {
    const isValidImageUrl = (image: unknown): image is string => typeof image === "string" && image.trim().length > 0 && image.trim() !== "undefined" && image.trim() !== "null";
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(isValidImageUrl);
    if (typeof value !== "string" || value === "[]") return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(isValidImageUrl);
    } catch {
        // The backend stores multiple URLs as a comma-separated string.
    }
    return value.split(",").map((image) => image.trim()).filter(isValidImageUrl).filter((image) => image !== "[]");
}

const fallbackImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
];

function RoomCard({ room, onEdit, onDelete }: { room: Room; onEdit: (room: Room) => void; onDelete: (room: Room) => void }) {
    const images = imageUrls(room.images);
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
                {images.length === 0 && <span className="absolute bottom-3 left-3 bg-[#202522]/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Preview image</span>}
                {slideshowImages.length > 1 && <>
                    <button type="button" onClick={() => moveImage(-1)} aria-label="Previous room photo" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><CaretLeftIcon size={18} weight="bold" /></button>
                    <button type="button" onClick={() => moveImage(1)} aria-label="Next room photo" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><CaretRightIcon size={18} weight="bold" /></button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-label="Room photo slides">{slideshowImages.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(index)} aria-label={`Show room photo ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === activeImage ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />)}</div>
                </>}
            </div>
            <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2.5"><h2 className="text-lg font-semibold text-[#202522]">Room {room.roomNumber}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${room.status === "AVAILABLE" ? "bg-[#dcecdf] text-[#397052]" : room.status === "OCCUPIED" ? "bg-[#eee4d6] text-[#94613a]" : "bg-[#f3dcd6] text-[#9d4937]"}`}>{room.status.toLowerCase()}</span></div>
                <p className="mt-2 text-sm text-[#707770]">₱{room.monthlyRent.toLocaleString()} / month · up to {room.maxOccupancy} {room.maxOccupancy === 1 ? "person" : "people"}</p>
                
                <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button onClick={() => onEdit(room)} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#cbc7bc] px-3 py-2 text-sm font-semibold text-[#202522] hover:border-[#202522] sm:w-fit"><PencilSimpleIcon /> Edit</button><button onClick={() => onDelete(room)} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#e1b8ae] px-3 py-2 text-sm font-semibold text-[#9d4937] hover:border-[#9d4937] sm:w-fit"><TrashIcon /> Delete</button></div>
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
    const [roomImages, setRoomImages] = useState<RoomImage[]>([]);
    const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
    const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const loadRooms = async (pageNumber: number = 0) => {
        if (pageNumber === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await endpoints.rooms.getAll(pageNumber, 10);
            const newRooms = response.data.content;
            if (pageNumber === 0) {
                setRooms(newRooms);
            } else {
                setRooms((current) => [...current, ...newRooms]);
            }
            setHasMore(!response.data.last);
            setPage(pageNumber);
        } catch (err) {
            setError("Could not load rooms. Check that the backend is running.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => { loadRooms(0); }, []);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadRooms(page + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, page]);

    const closeEditor = () => {
        roomImages.forEach((image) => { if (image.file) URL.revokeObjectURL(image.url); });
        setEditingId(null);
        setDraft(emptyDraft);
        setRoomImages([]);
        setRemovedImageUrls([]);
    };
    const updateDraft = (field: keyof RoomDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
    const openNewRoom = () => { setError(null); setEditingId(0); setDraft(emptyDraft); setRoomImages([]); setRemovedImageUrls([]); };
    const openEditRoom = (room: Room) => {
        setError(null);
        setEditingId(room.id);
        setDraft(draftFromRoom(room));
        setRoomImages(imageUrls(room.images).map((url, index) => ({ id: `${room.id}-${index}`, url, saved: true })));
        setRemovedImageUrls([]);
    };

    const deleteRoom = () => {
        if (!deletingRoom) return;
        setDeleting(true);
        setError(null);
        endpoints.rooms.remove(deletingRoom.id).then(async () => {
            setRooms((current) => current.filter((room) => room.id !== deletingRoom.id));
            setDeletingRoom(null);
            const paths = imageUrls(deletingRoom.images).map(storagePathFor).filter((path): path is string => Boolean(path));
            if (supabase && paths.length > 0) {
                const { error: removeError } = await supabase.storage.from("room-images").remove(paths);
                if (removeError) throw new Error(`Room deleted, but its photos could not be removed: ${removeError.message}`);
            }
        }).catch((deleteError: unknown) => {
            const typedError = deleteError as { message?: string; response?: { status?: number; data?: { message?: string } | string } };
            const responseMessage = typeof typedError.response?.data === "string" ? typedError.response.data : typedError.response?.data?.message;
            const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
            setError(`${responseMessage ?? typedError.message ?? "Could not delete this room."}${status}`);
        }).finally(() => setDeleting(false));
    };

    const addImages = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        const validFiles = files.filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);
        if (validFiles.length !== files.length) setError("Only image files up to 5 MB can be added.");
        setRoomImages((current) => [...current, ...validFiles.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, url: URL.createObjectURL(file), file }))]);
        event.target.value = "";
    };

    const removeImage = (imageId: string) => {
        setRoomImages((current) => {
            const image = current.find((item) => item.id === imageId);
            if (image?.file) URL.revokeObjectURL(image.url);
            else if (image) setRemovedImageUrls((removed) => [...removed, image.url]);
            return current.filter((item) => item.id !== imageId);
        });
    };

    const storagePathFor = (url: string) => {
        const marker = "/storage/v1/object/public/room-images/";
        const markerIndex = url.indexOf(marker);
        return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : null;
    };

    const removeDeletedImages = async () => {
        if (!supabase || removedImageUrls.length === 0) return;
        const paths = removedImageUrls.map(storagePathFor).filter((path): path is string => Boolean(path));
        if (paths.length === 0) return;
        const { error: removeError } = await supabase.storage.from("room-images").remove(paths);
        if (removeError) throw new Error(`Room saved, but Supabase could not remove old photos: ${removeError.message}`);
    };

    const uploadImages = async () => {
        const uploadedImages: string[] = [];
        const uploadedPaths: string[] = [];
        try {
            for (const image of roomImages) {
                if (!image.file) {
                    uploadedImages.push(image.url);
                    continue;
                }
                if (!supabase) throw new Error("Supabase image storage is not configured.");
                const extension = image.file.name.split(".").pop() || "jpg";
                const path = `rooms/${crypto.randomUUID()}.${extension}`;
                const { error: uploadError } = await supabase.storage.from("room-images").upload(path, image.file, { contentType: image.file.type, upsert: false });
                if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);
                uploadedPaths.push(path);
                const { data } = supabase.storage.from("room-images").getPublicUrl(path);
                uploadedImages.push(data.publicUrl);
            }
            return { urls: uploadedImages, paths: uploadedPaths };
        } catch (uploadError) {
            if (supabase && uploadedPaths.length > 0) await supabase.storage.from("room-images").remove(uploadedPaths);
            throw uploadError;
        }
    };

    const saveRoom = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (roomImages.length === 0) {
            setError("Add at least one room photo before saving.");
            return;
        }
        setSaving(true);
        setError(null);
        let newlyUploadedPaths: string[] = [];
        uploadImages().then(({ urls, paths }) => {
            newlyUploadedPaths = paths;
            const payload = { ...draft, images: urls, monthlyRent: Number(draft.monthlyRent), maxOccupancy: Number(draft.maxOccupancy) };
            return editingId ? endpoints.rooms.update(editingId, payload) : endpoints.rooms.create(payload);
        }).then((response) => {
            const savedRoom = response.data as Room;
            setRooms((current) => editingId ? current.map((room) => room.id === editingId ? savedRoom : room) : [...current, savedRoom]);
            closeEditor();
            return removeDeletedImages().catch((cleanupError: unknown) => {
                const message = cleanupError instanceof Error ? cleanupError.message : "Room saved, but old photos could not be removed from Supabase.";
                setError(message);
            });
        }).catch((saveError: unknown) => {
            if (supabase && newlyUploadedPaths.length > 0) void supabase.storage.from("room-images").remove(newlyUploadedPaths);
            const typedError = saveError as { message?: string; response?: { status?: number; data?: { message?: string } | string } };
            const responseMessage = typeof typedError.response?.data === "string"
                ? typedError.response.data
                : typedError.response?.data?.message;
            const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
            setError(`${responseMessage ?? typedError.message ?? "Could not save this room. Check the details and try again."}${status}`);
        }).finally(() => setSaving(false));
    };

    if (loading) return <p className="text-sm text-[#707770]">Loading rooms...</p>;

    return (
        <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
                <div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#397052] md:mb-2 md:text-xs">Property inventory</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">Rooms</h1><p className="mt-1.5 text-sm leading-6 text-[#707770] md:mt-2">Keep room details, pricing, and availability up to date.</p></div>
                <button onClick={openNewRoom} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#397052] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e5942] md:w-fit"><PlusIcon weight="bold" /> Add room</button>
            </div>
            {error && <p role="alert" className="border-l-2 border-[#9d4937] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">{error}</p>}
            
            <Modal
                isOpen={editingId !== null}
                onClose={closeEditor}
                title={editingId ? "Edit room" : "Add a room"}
                maxWidth="4xl"
                className="p-4 md:p-6"
            >
                <form onSubmit={saveRoom} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <label className="text-sm font-medium text-[#202522]">Room number<input required value={draft.roomNumber} onChange={(event) => updateDraft("roomNumber", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]" /></label>
                        <label className="text-sm font-medium text-[#202522]">Status<select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"><option value="AVAILABLE">Available</option><option value="OCCUPIED">Occupied</option><option value="MAINTENANCE">Maintenance</option></select></label>
                        <label className="text-sm font-medium text-[#202522]">Monthly rent<input required min="0" type="number" value={draft.monthlyRent} onChange={(event) => updateDraft("monthlyRent", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]" /></label>
                        <label className="text-sm font-medium text-[#202522]">Max occupancy<input required min="1" type="number" value={draft.maxOccupancy} onChange={(event) => updateDraft("maxOccupancy", event.target.value)} className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]" /></label>
                        <div className="text-sm font-medium text-[#202522] md:col-span-2 lg:col-span-3">
                            <span>Room photos</span>
                            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[#cbc7bc] bg-white px-4 py-5 text-sm font-semibold text-[#707770] transition-colors hover:border-[#397052] hover:text-[#397052]"><UploadSimpleIcon size={20} /><span>Choose photos</span><input type="file" accept="image/*" multiple onChange={addImages} className="sr-only" /></label>
                            <p className="mt-2 text-xs font-normal text-[#858b84]">JPG, PNG, or WEBP · up to 5 MB each</p>
                            {roomImages.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{roomImages.map((image, index) => <div key={image.id} className="group relative aspect-square overflow-hidden bg-[#dedbd2]"><img src={image.url} alt={`${image.saved ? "Saved" : "New"} room photo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(image.id)} aria-label={`Remove room photo ${index + 1}`} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#202522]/80 text-white opacity-100 transition-opacity hover:bg-[#397052] sm:opacity-0 sm:group-hover:opacity-100"><XIcon size={16} weight="bold" /></button><span className="absolute inset-x-0 bottom-0 truncate bg-[#202522]/75 px-2 py-1 text-[10px] font-semibold text-white">{image.saved ? "Saved photo" : image.file?.name ?? "New photo"}</span></div>)}</div>}
                            {roomImages.length === 0 && <div className="mt-3 flex items-center gap-2 text-xs font-normal text-[#9d4937]"><FileImageIcon />{editingId ? "No saved photos. Add at least one photo for the room." : "Add at least one photo for the room."}</div>}
                        </div>
                        <label className="text-sm font-medium text-[#202522] md:col-span-2 lg:col-span-3">Description<textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]" /></label>
                    </div>
                    <div className="mt-5 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
                        <button type="button" onClick={closeEditor} className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]">Cancel</button>
                        <button disabled={saving} className="rounded-md bg-[#202522] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : editingId ? "Save changes" : "Create room"}</button>
                    </div>
                </form>
            </Modal>
            <div className="grid gap-5 md:grid-cols-2">
                {rooms.length === 0 && !loading ? (
                    <p className="py-10 text-center text-sm text-[#707770] md:col-span-2">No rooms yet. Add your first room to get started.</p>
                ) : (
                    rooms.map((room) => <RoomCard key={room.id} room={room} onEdit={openEditRoom} onDelete={setDeletingRoom} />)
                )}
                {loadingMore && (
                    <div className="md:col-span-2 py-4 flex justify-center items-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#397052] border-t-transparent"></div>
                    </div>
                )}
            </div>
            <div ref={lastElementRef} className="h-2 w-full" />
            <Modal
                isOpen={!!deletingRoom}
                onClose={() => !deleting && setDeletingRoom(null)}
                title={<div className="mb-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397052]">Permanent action</p><h2 className="mt-1 text-xl font-semibold text-[#202522]">Delete Room {deletingRoom?.roomNumber}?</h2></div>}
                maxWidth="md"
                closeOnOutsideClick={!deleting}
                hideCloseButton={deleting}
            >
                <div className="border-t-2 border-[#397052] -mx-4 md:-mx-6 -mt-8 pt-6 px-4 md:px-6">
                    <p className="text-sm leading-6 text-[#707770]">This removes the room from Aiven and deletes its linked photos from Supabase Storage. This action cannot be undone.</p>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" disabled={deleting} onClick={() => setDeletingRoom(null)} className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]">Cancel</button>
                        <button type="button" disabled={deleting} onClick={deleteRoom} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#9d4937] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><TrashIcon /> {deleting ? "Deleting..." : "Delete room"}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}