import type { LocationStatus, UserLocation } from '../types/scan'

export type LocationResult = {
  locationStatus: LocationStatus
  userLocation: UserLocation | null
}

export async function requestUserLocation(): Promise<LocationResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      locationStatus: 'unavailable',
      userLocation: null,
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          locationStatus: 'granted',
          userLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          },
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ locationStatus: 'denied', userLocation: null })
          return
        }

        if (error.code === error.TIMEOUT) {
          resolve({ locationStatus: 'timeout', userLocation: null })
          return
        }

        resolve({ locationStatus: 'error', userLocation: null })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  })
}
