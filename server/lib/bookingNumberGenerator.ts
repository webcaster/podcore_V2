/**
 * Generiere kurze, lesbare Buchungsnummern
 * Format: SPONSOR_001 (3-stelliges Sponsor-Kürzel + 3-stellige Nummer)
 */

export function generateBookingNumber(sponsorName: string, sequenceNumber: number): string {
  // Sponsor-Kürzel: Erste 3 Buchstaben des Sponsor-Namens, uppercase
  const sponsorCode = (sponsorName || 'UNK')
    .replace(/[^a-zA-Z0-9]/g, '') // Nur alphanumerisch
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Auffüllen mit X wenn zu kurz
  
  // Sequenznummer: 3-stellig mit führenden Nullen
  const sequence = String(sequenceNumber).padStart(3, '0');
  
  return `${sponsorCode}_${sequence}`;
}

/**
 * Extrahiere die nächste Sequenznummer aus bestehenden Buchungsnummern
 * Beispiel: Wenn Nummern existieren ["APP_001", "APP_002"], gib 3 zurück
 */
export function getNextSequenceNumber(existingNumbers: string[]): number {
  if (!existingNumbers || existingNumbers.length === 0) {
    return 1;
  }
  
  // Extrahiere die Nummer aus dem Format SPONSOR_001
  const numbers = existingNumbers
    .map(num => {
      const match = num.match(/_(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  
  if (numbers.length === 0) {
    return 1;
  }
  
  return Math.max(...numbers) + 1;
}

// Beispiele:
// generateBookingNumber("Apple", 1) → "APP_001"
// generateBookingNumber("Samsung", 5) → "SAM_005"
// generateBookingNumber("123 Company", 10) → "COM_010"
// generateBookingNumber("AB", 1) → "ABX_001" (zu kurz, aufgefüllt)
// getNextSequenceNumber(["APP_001", "APP_002"]) → 3
