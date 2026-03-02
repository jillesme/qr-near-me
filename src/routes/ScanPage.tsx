import { Link } from 'wouter'
import { useQrStore } from '../store/qrStore'

type ScanPageProps = {
  uuid: string
}

export function ScanPage({ uuid }: ScanPageProps) {
  const status = useQrStore((state) => state.scanStatus)
  const busy = useQrStore((state) => state.scanBusy)
  const completeScan = useQrStore((state) => state.completeScan)

  return (
    <section className="card">
      <h2>Scan Landing</h2>
      <p>
        QR code <code>{uuid}</code> opened successfully.
      </p>
      <p>
        Tap the button below to share location and save this scan in the Durable
        Object.
      </p>

      <p>{status}</p>

      <div className="actions">
        <button
          type="button"
          onClick={() => {
            void completeScan(uuid)
          }}
          disabled={busy}
        >
          {busy ? 'Working...' : 'Complete scan'}
        </button>
        <Link href={`/qr/${uuid}`}>View scans for this QR</Link>
      </div>
    </section>
  )
}
