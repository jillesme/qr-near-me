import {
  acceptInteraction,
  createQrCode,
  getInteractions,
  getQrProfile,
} from '../../lib/api'
import type {
  AcceptInteractionRequest,
  CreateQrCodeRequest,
  GetInteractionsResponse,
  GetQrProfileResponse,
  AcceptInteractionResponse,
  CreateQrCodeResponse,
} from '../../../shared/contracts'

export function submitCreateQrCode(
  payload: CreateQrCodeRequest,
): Promise<CreateQrCodeResponse> {
  return createQrCode(payload)
}

export function fetchQrProfile(uuid: string): Promise<GetQrProfileResponse> {
  return getQrProfile(uuid)
}

export function submitAcceptInteraction(
  payload: AcceptInteractionRequest,
): Promise<AcceptInteractionResponse> {
  return acceptInteraction(payload)
}

export function fetchInteractions(uuid: string): Promise<GetInteractionsResponse> {
  return getInteractions(uuid)
}
