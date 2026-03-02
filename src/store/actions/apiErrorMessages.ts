import type { ApiError } from '../../../shared/contracts'

export function formatApiError(error: ApiError, fallbackMessage: string): string {
  switch (error.code) {
    case 'network_error':
      return 'Network error. Please check your connection and try again.'
    case 'invalid_payload':
      return 'The request could not be processed. Please check your input and retry.'
    case 'invalid_uuid':
      return 'This QR code link is invalid.'
    case 'not_found':
      return 'This QR code does not exist.'
    case 'creator_location_required':
      return 'Location is required unless Cloudflare colo fallback is enabled.'
    case 'websocket_upgrade_required':
      return 'Live updates are unavailable in this browser context.'
    case 'invalid_response':
      return 'Received an unexpected response from the server. Please retry.'
    default:
      return error.message || fallbackMessage
  }
}
