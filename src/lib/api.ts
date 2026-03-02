import type {
  CreateQrCodeResponse,
  CreateScanResponse,
  GetScansResponse,
  ScanCreateRequest,
} from '../types/scan'

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function createQrCode(): Promise<CreateQrCodeResponse> {
  const response = await fetch('/api/qr-codes', {
    method: 'POST',
  })

  return parseJson<CreateQrCodeResponse>(response)
}

export async function postScan(
  payload: ScanCreateRequest,
): Promise<CreateScanResponse> {
  const response = await fetch('/api/scans', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJson<CreateScanResponse>(response)
}

export async function getScans(uuid: string): Promise<GetScansResponse> {
  const response = await fetch(`/api/scans/${uuid}`)
  return parseJson<GetScansResponse>(response)
}

export function connectScansStream(uuid: string): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(`${protocol}://${window.location.host}/api/scans/${uuid}/stream`)
}
