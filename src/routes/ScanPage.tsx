import { Link } from 'wouter'

type ScanPageProps = {
  uuid: string
}

export function ScanPage({ uuid }: ScanPageProps) {
  return (
    <section className="card">
      <h2>Scan Landing</h2>
      <p>
        QR code <code>{uuid}</code> opened successfully.
      </p>
      <p>
        Next phase: ask for browser geolocation, then POST scan + location status
        to the Worker API.
      </p>
      <div className="actions">
        <Link href={`/qr/${uuid}`}>View scans for this QR</Link>
      </div>
    </section>
  )
}
