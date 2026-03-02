import { Link } from 'wouter'

type QrDetailPageProps = {
  uuid: string
}

export function QrDetailPage({ uuid }: QrDetailPageProps) {
  return (
    <section className="card">
      <h2>QR Detail</h2>
      <p>
        This page will list everyone who scanned <code>{uuid}</code>.
      </p>
      <p>
        Next phase: fetch from <code>GET /api/scans/:uuid</code> and show timestamp,
        Cloudflare colo, and browser location data/status.
      </p>
      <div className="actions">
        <Link href={`/q/${uuid}`}>Open scan landing page</Link>
      </div>
    </section>
  )
}
