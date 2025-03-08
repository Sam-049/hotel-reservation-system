import { Component, signal } from '@angular/core';
import { BookingService } from '../../services/booking.service';
import { NgIf, NgFor, NgClass } from '@angular/common';

@Component({
  selector: 'app-booking',
  standalone: true,
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
  imports: [NgIf, NgFor, NgClass],
})
export class BookingComponent {
  availableRooms = signal<any[]>([]);
  bookedRooms = signal<number[]>([]);
  randomOccupiedRooms = signal<number[]>([]);
  numRooms = signal<number>(1);

  constructor(private bookingService: BookingService) {
    this.fetchAvailableRooms();
  }

  fetchAvailableRooms() {
    this.bookingService.getAvailableRooms().subscribe((data: any) => {
      // Ensure rooms are sorted by room number
      const sortedRooms = data.sort((a: any, b: any) => a.room_number - b.room_number);
      this.availableRooms.set(sortedRooms);
    });
  }
  
  

  bookRooms() {
    if (this.numRooms() < 1 || this.numRooms() > 5) {
      alert('You can only book between 1 to 5 rooms.');
      return;
    }
  
    const requiredRooms = this.numRooms();
    const available = this.availableRooms()
      .filter(room => !this.isBooked(room.room_number) && !this.isRandomlyOccupied(room.room_number)) // Exclude randomly occupied rooms
      .sort((a, b) => a.floor_id - b.floor_id || a.room_number - b.room_number); // Sort by floor, then by room number
  
    // Step 1: Try to book all rooms on the same floor
    const groupedByFloor = new Map<number, any[]>();
    available.forEach(room => {
      if (!groupedByFloor.has(room.floor_id)) {
        groupedByFloor.set(room.floor_id, []);
      }
      groupedByFloor.get(room.floor_id)?.push(room);
    });
  
    for (const [floor, rooms] of groupedByFloor.entries()) {
      if (rooms.length >= requiredRooms) {
        const selectedRooms = rooms.slice(0, requiredRooms).map(r => r.room_number);
        this.confirmBooking(selectedRooms);
        return;
      }
    }
  
    // Step 2: If not enough on one floor, pick the best combination across floors
    let bestCombo: number[] = [];
    let minTravelTime = Infinity;
  
    const findBestCombination = (selected: any[], remaining: any[]) => {
      if (selected.length === requiredRooms) {
        const travelTime = this.calculateTravelTime(selected);
        if (travelTime < minTravelTime) {
          minTravelTime = travelTime;
          bestCombo = selected.map(r => r.room_number);
        }
        return;
      }
  
      for (let i = 0; i < remaining.length; i++) {
        findBestCombination([...selected, remaining[i]], remaining.slice(i + 1));
      }
    };
  
    findBestCombination([], available);
  
    if (bestCombo.length > 0) {
      this.confirmBooking(bestCombo);
    } else {
      alert('Not enough available rooms to book.');
    }
  }
  
  
  // Helper function to calculate travel time
  calculateTravelTime(selectedRooms: any[]): number {
    selectedRooms.sort((a, b) => a.floor_id - b.floor_id || a.room_number - b.room_number);
    let time = 0;
    for (let i = 1; i < selectedRooms.length; i++) {
      if (selectedRooms[i].floor_id !== selectedRooms[i - 1].floor_id) {
        time += 2; // Vertical movement cost
      }
      time += Math.abs(selectedRooms[i].room_number - selectedRooms[i - 1].room_number); // Horizontal movement cost
    }
    return time;
  }
  
  // Function to confirm the booking
  confirmBooking(selectedRooms: number[]) {
    this.bookingService.bookRooms(selectedRooms.length).subscribe(() => {
      this.bookedRooms.set([...this.bookedRooms(), ...selectedRooms]);
      alert(`Rooms booked: ${selectedRooms.join(', ')}`);
    });
  }
  
  

  // bookRooms() {
  //   if (this.numRooms() < 1 || this.numRooms() > 5) {
  //     alert('You can only book between 1 to 5 rooms.');
  //     return;
  //   }

  //   this.bookingService.bookRooms(this.numRooms()).subscribe((data: any) => {
  //     this.bookedRooms.set(data.bookedRooms);
  //     alert('Rooms booked successfully!');
  //   });
  // }
  

  resetBookings() {
    this.bookedRooms.set([]);
    this.randomOccupiedRooms.set([]);
    alert('All bookings have been reset!');
  }

  generateRandomOccupancy() {
    this.bookingService.generateRandomOccupancy().subscribe((data: any) => {
      this.randomOccupiedRooms.set(data.occupiedRooms);
      alert(`Random rooms occupied: ${this.randomOccupiedRooms().join(', ')}`);
      this.fetchAvailableRooms();
    });
  }

  getFloors(): number[] {
    return Array.from(new Set(this.availableRooms().map(room => room.floor_id))).sort((a, b) => b - a);
  }

  getRoomsByFloor(floor: number) {
    return this.availableRooms().filter(room => room.floor_id === floor);
  }
  

  isBooked(roomNumber: number) {
    return this.bookedRooms().includes(roomNumber);
  }

  isRandomlyOccupied(roomNumber: number) {
    return this.randomOccupiedRooms().includes(roomNumber);
  }

  updateNumRooms(event: Event) {
    const input = event.target as HTMLInputElement;
    this.numRooms.set(Number(input.value)); // Convert value to number explicitly
  }
  
}
