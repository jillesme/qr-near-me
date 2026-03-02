import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'wouter'

function newUuid() {
  return crypto.randomUUID()
}

export function CreateQrPage() {
  const [uuid, setUuid] = useState(() => newUuid())
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const scanUrl = useMemo(() => `${origin}/q/${uuid}`, [origin, uuid])
  const detailUrl = useMemo(() => `${origin}/qr/${uuid}`, [origin, uuid])

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus('Copied to clipboard')
    } catch {
      setCopyStatus('Copy failed in this browser')
    }
  }

  return (
    <section className="card">
      <h2>Create QR</h2>
      <p>
        Create a QR-linked UUID, then open scan and detail pages for this code.
      </p>

      <div className="qr-wrap">
        <QRCodeSVG value={scanUrl} size={220} marginSize={1} includeMargin />
      </div>

      <p>
        UUID: <code>{uuid}</code>
      </p>
      <p>
        Scan URL: <code>{scanUrl}</code>
      </p>
      <p>
        Detail URL: <code>{detailUrl}</code>
      </p>

      <div className="actions">
        <button type="button" onClick={() => setUuid(newUuid())}>
          Generate new UUID
        </button>
        <button type="button" onClick={() => copyText(scanUrl)}>
          Copy scan URL
        </button>
        <button type="button" onClick={() => copyText(detailUrl)}>
          Copy detail URL
        </button>
        <Link href={`/q/${uuid}`}>Open scan page</Link>
        <Link href={`/qr/${uuid}`}>Open detail page</Link>
      </div>
      {copyStatus ? <p>{copyStatus}</p> : null}
    </section>
  )
}
