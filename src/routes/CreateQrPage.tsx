import { Link } from 'wouter'

export function CreateQrPage() {
  const demoUuid = '11111111-1111-4111-8111-111111111111'

  return (
    <section className="card">
      <h2>Create QR</h2>
      <p>
        This page will create a UUID and render a QR code. For now, use the demo
        link below.
      </p>
      <p>
        <code>/q/{demoUuid}</code>
      </p>
      <div className="actions">
        <Link href={`/q/${demoUuid}`}>Open scan page</Link>
        <Link href={`/qr/${demoUuid}`}>Open detail page</Link>
      </div>
    </section>
  )
}
