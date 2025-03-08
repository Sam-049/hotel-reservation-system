require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL connection setup
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(cors());
app.use(bodyParser.json());

// Test API
app.get("/", (req, res) => {
    res.send("Hotel Booking API is running...");
});

// Fetch available rooms
app.get("/rooms", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM rooms ORDER BY floor_id, room_number");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// API to book rooms
app.post("/book", async (req, res) => {
    const { numRooms } = req.body;

    if (!numRooms || numRooms < 1 || numRooms > 5) {
        return res.status(400).json({ error: "You can book between 1 to 5 rooms." });
    }

    try {
        // Fetch available rooms sorted by floor and proximity
        const result = await pool.query(
            "SELECT * FROM rooms WHERE is_occupied = FALSE ORDER BY floor_id, room_number"
        );

        let availableRooms = result.rows;
        if (availableRooms.length < numRooms) {
            return res.status(400).json({ error: "Not enough rooms available." });
        }

        // Priority: Try to book on the same floor first
        let selectedRooms = [];
        for (let i = 0; i < availableRooms.length; i++) {
            let floorRooms = availableRooms.filter(room => room.floor_id === availableRooms[i].floor_id);
            if (floorRooms.length >= numRooms) {
                selectedRooms = floorRooms.slice(0, numRooms);
                break;
            }
        }

        // If no single floor has enough rooms, select rooms across floors
        if (selectedRooms.length === 0) {
            selectedRooms = availableRooms.slice(0, numRooms);
        }

        const bookedRoomIds = selectedRooms.map(room => room.id);
        const bookedRoomNumbers = selectedRooms.map(room => room.room_number);

        // Update database to mark selected rooms as occupied
        await pool.query(
            "UPDATE rooms SET is_occupied = TRUE WHERE id = ANY($1)",
            [bookedRoomIds]
        );

        // Store booking details
        await pool.query(
            "INSERT INTO bookings (booked_rooms) VALUES ($1)",
            [bookedRoomNumbers]
        );

        res.json({ message: "Rooms booked successfully", bookedRooms: bookedRoomNumbers });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Booking failed due to a server error" });
    }
});

// API to reset all bookings (mark all rooms as available)
app.post("/reset", async (req, res) => {
    try {
        await pool.query("UPDATE rooms SET is_occupied = FALSE");
        res.json({ message: "All bookings have been reset." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Reset failed due to a server error" });
    }
});

// API to generate random occupancy
// API to generate random occupancy and return occupied rooms
app.post("/random-occupancy", async (req, res) => {
    try {
        // First, reset all bookings
        await pool.query("UPDATE rooms SET is_occupied = FALSE");

        // Fetch all rooms
        const result = await pool.query("SELECT id, room_number FROM rooms");
        let allRooms = result.rows;

        // Select random rooms to occupy (20-30% of rooms)
        let numRoomsToOccupy = Math.floor(allRooms.length * (Math.random() * 0.1 + 0.2)); 
        let roomsToOccupy = allRooms.sort(() => 0.5 - Math.random()).slice(0, numRoomsToOccupy);
        
        if (roomsToOccupy.length > 0) {
            let roomIds = roomsToOccupy.map(room => room.id);
            let roomNumbers = roomsToOccupy.map(room => room.room_number);

            // Update database to mark selected rooms as occupied
            await pool.query("UPDATE rooms SET is_occupied = TRUE WHERE id = ANY($1)", [roomIds]);

            return res.json({ 
                message: "Random occupancy generated successfully", 
                occupiedRooms: roomNumbers 
            });
        }

        res.json({ message: "No rooms were occupied randomly" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Random occupancy generation failed" });
    }
});





app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
