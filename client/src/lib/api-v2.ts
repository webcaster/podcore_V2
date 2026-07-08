// ============================================================
// PodCore API Client v2.12.0 - Sponsoring System
// ============================================================

import { api } from './api';

export const sponsorsV2Api = {
  // Sponsor Contracts
  listContracts: (sponsorId: string) =>
    api.get<any[]>(`/sponsors/v2/${sponsorId}/contracts`),
  createContract: (sponsorId: string, data: any) =>
    api.post<any>(`/sponsors/v2/${sponsorId}/contracts`, data),
  updateContract: (contractId: string, data: any) =>
    api.put<any>(`/sponsors/v2/contracts/${contractId}`, data),
  deleteContract: (contractId: string) =>
    api.delete(`/sponsors/v2/contracts/${contractId}`),

  // Ad Bookings
  listBookings: (sponsorId: string, params?: { from?: string; to?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return api.get<any[]>(`/sponsors/v2/${sponsorId}/bookings${qs}`);
  },
  createBooking: (sponsorId: string, data: any) =>
    api.post<any>(`/sponsors/v2/${sponsorId}/bookings`, data),
  updateBooking: (bookingId: string, data: any) =>
    api.put<any>(`/sponsors/v2/bookings/${bookingId}`, data),
  deleteBooking: (bookingId: string) =>
    api.delete(`/sponsors/v2/bookings/${bookingId}`),

  // Booking Calendar
  getBookingCalendar: (params?: { from?: string; to?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return api.get<any>(`/sponsors/v2/calendar/bookings${qs}`);
  },
};
