import { useEffect } from 'react'
import { Link } from 'wouter'
import { useQrStore } from '../store/qrStore'

type ScanPageProps = {
  uuid: string
}

export function ScanPage({ uuid }: ScanPageProps) {
  const profile = useQrStore((state) => state.scanProfile)
  const status = useQrStore((state) => state.scanStatus)
  const busy = useQrStore((state) => state.scanBusy)
  const locationRequested = useQrStore((state) => state.scannerLocationRequested)

  const loadScanProfile = useQrStore((state) => state.loadScanProfile)
  const requestScannerLocation = useQrStore(
    (state) => state.requestScannerLocation,
  )
  const acceptScanInteraction = useQrStore((state) => state.acceptScanInteraction)

  useEffect(() => {
    void loadScanProfile(uuid)
  }, [uuid, loadScanProfile])

  return (
    <section className="card">
      <h2>Scan QR</h2>
      <p>
        QR code <code>{uuid}</code> opened.
      </p>

      {profile ? (
        <>
          <p>
            You are about to talk with <strong>{profile.name}</strong>.
          </p>
          <p>
            Topic: <strong>{profile.topic}</strong>
          </p>
          <p>
            Location policy:{' '}
            {profile.allowColoFallback
              ? 'GPS preferred, colo fallback allowed'
              : 'GPS required'}
          </p>
        </>
      ) : null}

      <p>{status}</p>

      <div className="actions">
        <button
          type="button"
          onClick={() => {
            void requestScannerLocation()
          }}
          disabled={busy || !profile}
        >
          {busy ? 'Working...' : 'Share location'}
        </button>
        <button
          type="button"
          onClick={() => {
            void acceptScanInteraction(uuid)
          }}
          disabled={busy || !profile || !locationRequested}
        >
          {busy ? 'Working...' : 'Accept interaction'}
        </button>
        <Link href={`/qr/${uuid}`}>View interaction history</Link>
      </div>
    </section>
  )
}
