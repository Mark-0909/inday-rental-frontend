"use client";

import React, { useEffect, useState } from "react";
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon, HouseLineIcon, MapPinIcon, PhoneIcon, XIcon } from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";
import { Room } from "@/types";

const fallbackImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85",
];

type Filter = "ALL" | Room["status"];

function imagesFor(room: Room) {
    const isValidImageUrl = (image: unknown): image is string => typeof image === "string" && image.trim().length > 0 && image.trim() !== "undefined" && image.trim() !== "null";
    const images = Array.isArray(room.images)
        ? room.images.filter(isValidImageUrl)
        : typeof room.images === "string"
            ? room.images.split(",").map((image) => image.trim()).filter(isValidImageUrl).filter((image) => image !== "[]")
            : [];
    return images.length > 0 ? images : fallbackImages;
}

function RoomPreview({ room, onOpen }: { room: Room; onOpen: (room: Room) => void }) {
    const images = imagesFor(room);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        if (images.length < 2) return;
        const timer = window.setInterval(() => setActiveImage((current) => (current + 1) % images.length), 5500);
        return () => window.clearInterval(timer);
    }, [images.length]);

    const moveImage = (direction: number) => setActiveImage((current) => (current + direction + images.length) % images.length);

    return (
        <article role="button" tabIndex={0} onClick={() => onOpen(room)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(room); }} className="group cursor-pointer overflow-hidden border border-[#dcd9d1] bg-[#fbfaf7] transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#d96c52]">
            <div className="relative aspect-4/3 overflow-hidden bg-[#dedbd2]">
                <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url("${images[activeImage]}")` }} role="img" aria-label={`Photo of room ${room.roomNumber}`} />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/50 to-transparent" />
                <span className={`absolute left-4 top-4 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${room.status === "AVAILABLE" ? "bg-[#dcecdf] text-[#397052]" : room.status === "OCCUPIED" ? "bg-[#eee4d6] text-[#94613a]" : "bg-[#f3dcd6] text-[#9d4937]"}`}>{room.status.toLowerCase()}</span>
                {images.length > 1 && <>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveImage(-1); }} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><CaretLeftIcon size={18} weight="bold" /></button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveImage(1); }} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><CaretRightIcon size={18} weight="bold" /></button>
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">{images.map((image, index) => <button key={image} type="button" onClick={(event) => { event.stopPropagation(); setActiveImage(index); }} aria-label={`Show photo ${index + 1}`} className={`h-1.5 rounded-full ${index === activeImage ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />)}</div>
                </>}
            </div>
            <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#858b84]">Inday Rental</p><h2 className="mt-1 text-xl font-semibold text-[#202522]">Room {room.roomNumber}</h2></div><p className="text-right text-lg font-semibold text-[#d96c52]">₱{room.monthlyRent.toLocaleString()}<span className="block text-xs font-normal text-[#858b84]">per month</span></p></div>
                <div className="mt-5 flex items-center justify-between border-t border-[#e5e2da] pt-4 text-sm text-[#707770]"><span>{room.maxOccupancy} {room.maxOccupancy === 1 ? "person" : "people"}</span><span className="inline-flex items-center gap-1.5 font-semibold text-[#202522]">View details <ArrowRightIcon weight="bold" /></span></div>
            </div>
        </article>
    );
}

export default function ViewingPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [filter, setFilter] = useState<Filter>("AVAILABLE");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [detailImage, setDetailImage] = useState(0);

    useEffect(() => {
        endpoints.rooms.getAll().then((response) => setRooms(response.data)).catch(() => setError(true)).finally(() => setLoading(false));
    }, []);

    const visibleRooms = rooms.filter((room) => filter === "ALL" || room.status === filter);
    const selectedImages = selectedRoom ? imagesFor(selectedRoom) : [];
    const closeDetails = () => setSelectedRoom(null);
    const openDetails = (room: Room) => { setSelectedRoom(room); setDetailImage(0); };

    return (
        <main className="min-h-screen bg-[#f4f2ed] text-[#202522]">
            <header className="border-b border-[#dcd9d1] bg-[#202522] text-[#f8f7f3]">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 sm:py-6"><a href="/viewing" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d96c52] text-xl font-black">I</span><span><strong className="block text-lg leading-none">Inday Rental</strong><small className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-[#aeb4ac]">Find your next room</small></span></a><a href="#contact" className="inline-flex items-center gap-2 text-sm font-semibold text-[#f8f7f3] hover:text-[#f0a18e]">Contact us <ArrowRightIcon weight="bold" /></a></div>
            </header>
            <section className="mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d96c52]">Rooms for rent in Cebu City</p><h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">A room that feels like your own.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#707770] sm:text-lg">Browse the rooms currently available at Inday Rental. See the space, check the essentials, and get in touch to arrange a visit.</p><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#707770]"><span className="inline-flex items-center gap-2"><MapPinIcon className="text-[#d96c52]" weight="fill" /> Cebu City</span><span className="inline-flex items-center gap-2"><HouseLineIcon className="text-[#d96c52]" weight="fill" /> Comfortable, cared-for spaces</span></div></div></section>
            <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8"><div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#dcd9d1] pb-5 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Available rooms</h2><p className="mt-1 text-sm text-[#858b84]">Choose a space that fits your everyday.</p></div><div className="flex gap-1 bg-[#e7e3d9] p-1">{(["AVAILABLE", "ALL"] as Filter[]).map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`px-3 py-2 text-xs font-semibold ${filter === option ? "bg-[#fbfaf7] text-[#202522]" : "text-[#707770]"}`}>{option === "AVAILABLE" ? "Available now" : "All rooms"}</button>)}</div></div>{loading ? <p className="py-16 text-sm text-[#707770]">Finding rooms...</p> : error ? <p className="border-l-2 border-[#d96c52] bg-[#fbfaf7] px-4 py-3 text-sm text-[#9d4937]">Rooms are temporarily unavailable. Please try again shortly.</p> : visibleRooms.length === 0 ? <p className="py-16 text-sm text-[#707770]">There are no rooms matching this view right now.</p> : <div className="grid gap-6 md:grid-cols-2">{visibleRooms.map((room) => <RoomPreview key={room.id} room={room} onOpen={openDetails} />)}</div>}</section>
            <section id="contact" className="bg-[#e7e3d9]"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-5 py-12 sm:flex-row sm:items-center sm:px-8 sm:py-16"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d96c52]">Come see the space</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Ready to take a look?</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#707770]">Send us a message and we&apos;ll help you find a room and schedule a viewing.</p></div><a href="tel:+639000000000" className="inline-flex w-fit items-center gap-2 bg-[#202522] px-5 py-3 text-sm font-semibold text-white hover:bg-[#d96c52]"><PhoneIcon weight="fill" /> Request a viewing</a></div></section>
            <footer className="mx-auto max-w-7xl px-5 py-6 text-xs text-[#858b84] sm:px-8">Inday Rental · Cebu City</footer>
            {selectedRoom && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202522]/60 p-0 sm:items-center sm:p-6" role="presentation" onClick={closeDetails}>
                <section role="dialog" aria-modal="true" aria-labelledby="room-detail-title" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto bg-[#fbfaf7] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#dcd9d1] px-5 py-4 sm:px-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d96c52]">Room details</p><button type="button" onClick={closeDetails} aria-label="Close room details" className="p-1 text-[#707770] hover:text-[#202522]"><XIcon size={22} /></button></div>
                    <div className="grid md:grid-cols-[1.1fr_0.9fr]">
                        <div className="relative aspect-4/3 bg-[#dedbd2] md:aspect-auto md:min-h-105"><div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${selectedImages[detailImage]}")` }} role="img" aria-label={`Photo of room ${selectedRoom.roomNumber}`} />{selectedImages.length > 1 && <><button type="button" onClick={() => setDetailImage((current) => (current - 1 + selectedImages.length) % selectedImages.length)} aria-label="Previous room photo" className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"><CaretLeftIcon size={20} weight="bold" /></button><button type="button" onClick={() => setDetailImage((current) => (current + 1) % selectedImages.length)} aria-label="Next room photo" className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"><CaretRightIcon size={20} weight="bold" /></button><div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">{selectedImages.map((image, index) => <button key={image} type="button" onClick={() => setDetailImage(index)} aria-label={`Show room photo ${index + 1}`} className={`h-1.5 rounded-full ${index === detailImage ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />)}</div></>}</div>
                        <div className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#858b84]">Inday Rental</p><h2 id="room-detail-title" className="mt-1 text-2xl font-semibold">Room {selectedRoom.roomNumber}</h2></div><span className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${selectedRoom.status === "AVAILABLE" ? "bg-[#dcecdf] text-[#397052]" : selectedRoom.status === "OCCUPIED" ? "bg-[#eee4d6] text-[#94613a]" : "bg-[#f3dcd6] text-[#9d4937]"}`}>{selectedRoom.status.toLowerCase()}</span></div><dl className="mt-7 grid grid-cols-2 gap-5 border-y border-[#e5e2da] py-5 text-sm"><div><dt className="text-[#858b84]">Monthly rent</dt><dd className="mt-1 text-lg font-semibold text-[#d96c52]">₱{selectedRoom.monthlyRent.toLocaleString()}</dd></div><div><dt className="text-[#858b84]">Max occupancy</dt><dd className="mt-1 font-semibold">{selectedRoom.maxOccupancy} {selectedRoom.maxOccupancy === 1 ? "person" : "people"}</dd></div></dl><div className="mt-6"><h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#858b84]">About this room</h3><p className="mt-3 text-sm leading-7 text-[#707770]">{selectedRoom.description || "A comfortable room in a cared-for Cebu City property."}</p></div><a href="#contact" onClick={closeDetails} className="mt-7 inline-flex w-full items-center justify-center gap-2 bg-[#202522] px-5 py-3 text-sm font-semibold text-white hover:bg-[#d96c52]">Request a viewing <ArrowRightIcon weight="bold" /></a></div>
                    </div>
                </section>
            </div>}
        </main>
    );
}
