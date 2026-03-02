import { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'wouter'
import { useQrStore } from '../store/qrStore'

export function CreateQrPage() {
  const createForm = useQrStore((state) => state.createForm)
  const createStatus = useQrStore((state) => state.createStatus)
  const createBusy = useQrStore((state) => state.createBusy)
  const createdQr = useQrStore((state) => state.createdQr)
  const creatorLocation = useQrStore((state) => state.creatorLocation)
  const creatorLocationStatus = useQrStore((state) => state.creatorLocationStatus)
  const copyStatus = useQrStore((state) => state.copyStatus)

  const setCreateName = useQrStore((state) => state.setCreateName)
  const setCreateTopic = useQrStore((state) => state.setCreateTopic)
  const setAllowColoFallback = useQrStore((state) => state.setAllowColoFallback)
  const setCopyStatus = useQrStore((state) => state.setCopyStatus)
  const createQr = useQrStore((state) => state.createQr)

  const scanUrl = useMemo(() => createdQr?.scanUrl ?? null, [createdQr])
  const detailUrl = useMemo(() => createdQr?.detailUrl ?? null, [createdQr])

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
        Enter your name and what you want to talk about. When you create, we ask
        for your location and attach metadata to the QR code.
      </p>
      <p>
        Important: clicking Create QR code will prompt for location. You must
        accept location permission or the QR code will not be created.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void createQr()
        }}
        className="form-stack"
      >
        <label>
          Your name
          <input
            value={createForm.name}
            onChange={(nextEvent) => setCreateName(nextEvent.target.value)}
            minLength={1}
            maxLength={80}
            required
          />
        </label>

        <label>
          What do you want to talk about?
          <input
            value={createForm.topic}
            onChange={(nextEvent) => setCreateTopic(nextEvent.target.value)}
            minLength={1}
            maxLength={160}
            required
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={createForm.allowColoFallback}
            onChange={(nextEvent) =>
              setAllowColoFallback(nextEvent.target.checked)
            }
          />
          Allow Cloudflare colo fallback when scanner denies location
        </label>

        <div className="actions">
          <button type="submit" disabled={createBusy}>
            {createBusy ? 'Creating...' : 'Create QR code'}
          </button>
        </div>
      </form>

      {createdQr && scanUrl && detailUrl ? (
        <>
          <div className="qr-wrap">
            <QRCodeSVG value={scanUrl} size={220} marginSize={1} includeMargin />
          </div>

          <p>
            UUID: <code>{createdQr.uuid}</code>
          </p>
          <p>
            Scan URL: <code>{scanUrl}</code>
          </p>
          <p>
            Detail URL: <code>{detailUrl}</code>
          </p>

          <div className="actions">
            <button type="button" onClick={() => copyText(scanUrl)}>
              Copy scan URL
            </button>
            <button type="button" onClick={() => copyText(detailUrl)}>
              Copy detail URL
            </button>
            <Link href={`/q/${createdQr.uuid}`}>Open scan page</Link>
            <Link href={`/qr/${createdQr.uuid}`}>Open detail page</Link>
          </div>
        </>
      ) : null}

      <p>{createStatus}</p>
      {creatorLocation ? (
        <p>
          Creator location status: {creatorLocationStatus} ({creatorLocation.lat.toFixed(5)},{' '}
          {creatorLocation.lng.toFixed(5)})
        </p>
      ) : (
        <p>Creator location status: {creatorLocationStatus}</p>
      )}
      {copyStatus ? <p>{copyStatus}</p> : null}
    </section>
  )
}
