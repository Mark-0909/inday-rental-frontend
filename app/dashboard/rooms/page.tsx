"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Room } from "@/types";
import { endpoints} from "@/api/clients";

export default function RoomsPage(){
    const[rooms, setRooms] = useState<Room[]>([]);
    const[loading, setloading] =useState<boolean>(true);
    const[error, setError] = useState<string | null>(null);

    useEffect(() => {
        endpoints.rooms.getAll()
        .then((response) => {
            setRooms(response.data);
            setloading(false);
        })
        .catch((err) => {
            console.error("API Error", err);
            setError("Failed to fetch rental records.Ensure your backend server is online and accessible.");
            setloading(false);
        })
    }, []);

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;


    if(loading){
        return <div>Loading...</div>;
    }

    if(error){
        return <div>Error: {error}</div>;
    }

    return(
        <div>
            <h1>Rooms</h1>
            {error && <p>{error}</p>}
            <ul>
                {rooms.map((room) => (
                    <li key={room.id}>{room.roomNumber}</li>
                ))}
            </ul>
        </div>
    );



}