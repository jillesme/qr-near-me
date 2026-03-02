import type {
  AcceptInteractionRequest,
  AcceptInteractionResponse,
  CreateQrCodeRequest,
  CreateQrCodeResponse,
  GetInteractionsResponse,
  GetQrProfileResponse,
} from '../../shared/contracts'

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function createQrCode(
  payload: CreateQrCodeRequest,
): Promise<CreateQrCodeResponse> {
  const response = await fetch('/api/qr-codes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJson<CreateQrCodeResponse>(response)
}

export async function getQrProfile(uuid: string): Promise<GetQrProfileResponse> {
  const response = await fetch(`/api/qr-codes/${uuid}`)
  return parseJson<GetQrProfileResponse>(response)
}

export async function acceptInteraction(
  payload: AcceptInteractionRequest,
): Promise<AcceptInteractionResponse> {
  const response = await fetch('/api/interactions/accept', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseJson<AcceptInteractionResponse>(response)
}

export async function getInteractions(
  uuid: string,
): Promise<GetInteractionsResponse> {
  const response = await fetch(`/api/interactions/${uuid}`)
  return parseJson<GetInteractionsResponse>(response)
}

export function connectInteractionsStream(uuid: string): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(
    `${protocol}://${window.location.host}/api/interactions/${uuid}/stream`,
  )
}
