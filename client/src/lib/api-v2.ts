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

  // All Slots (for episode editor booking form)
  listAllSlots: () => api.get<any[]>('/sponsors/v2/slots'),

  // Booking Confirmation PDF URL (direct download link)
  getConfirmationPdfUrl: (bookingId: string) =>
    `/api/sponsors/v2/bookings/${bookingId}/confirmation-pdf`,

  // Sammel-Buchungsbestätigung: alle Buchungen eines Sponsors als ein PDF
  getAllConfirmationsPdfUrl: (sponsorId: string, filter?: string) => {
    const qs = filter && filter !== 'alle' ? `?filter=${encodeURIComponent(filter)}` : '';
    return `/api/sponsors/v2/${sponsorId}/bookings/confirmation-pdf-all${qs}`;
  },

  // Sponsor Offers (Angebote)
  listOffers: (sponsorId: string) =>
    api.get<any[]>(`/sponsors/v2/${sponsorId}/offers`),
  createOffer: (sponsorId: string, data: any) =>
    api.post<any>(`/sponsors/v2/${sponsorId}/offers`, data),
  updateOffer: (offerId: string, data: any) =>
    api.put<any>(`/sponsors/v2/offers/${offerId}`, data),
  deleteOffer: (offerId: string) =>
    api.delete(`/sponsors/v2/offers/${offerId}`),
  archiveOffer: (offerId: string) =>
    api.post<any>(`/sponsors/v2/offers/${offerId}/archive`, {}),
  getPriceListPdfUrl: () =>
    `/api/sponsors/v2/price-list-pdf`,
  acceptOffer: (offerId: string, data: any) =>
    api.post<any>(`/sponsors/v2/offers/${offerId}/accept`, data),
  getOfferPdfUrl: (offerId: string) =>
    `/api/sponsors/v2/offers/${offerId}/pdf`,
};

// Episoden-Vorlagen API
export const episodeTemplatesApi = {
  list: () => api.get<any[]>('/episodes/templates'),
  create: (data: any) => api.post<any>('/episodes/templates', data),
  update: (templateId: string, data: any) => api.put<any>(`/episodes/templates/${templateId}`, data),
  remove: (templateId: string) => api.delete(`/episodes/templates/${templateId}`),
  delete: (templateId: string) => api.delete(`/episodes/templates/${templateId}`),
};
