// src/services/booking.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:5000'; // Backend URL

  constructor(private http: HttpClient) {}

  getAvailableRooms() {
    return this.http.get(`${this.apiUrl}/rooms`);
  }

  bookRooms(numRooms: number) {
    return this.http.post(`${this.apiUrl}/book`, { numRooms });
  }

  resetBookings() {
    return this.http.post(`${this.apiUrl}/reset`, {});
  }

  generateRandomOccupancy() {
    return this.http.post(`${this.apiUrl}/random-occupancy`, {});
  }
}
