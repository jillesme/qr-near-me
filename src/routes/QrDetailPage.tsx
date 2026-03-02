import { useEffect } from 'react'
import { Link } from 'wouter'
import { useQrStore } from '../store/qrStore'

type QrDetailPageProps = {
  uuid: string
}

export function QrDetailPage({ uuid }: QrDetailPageProps) {
  const events = useQrStore((state) => state.events)
  const status = useQrStore((state) => state.detailStatus)
  const detailLoading = useQrStore((state) => state.detailLoading)
  const streamConnected = useQrStore((state) => state.streamConnected)
  const loadScans = useQrStore((state) => state.loadScans)
  const connectStream = useQrStore((state) => state.connectStream)
  const disconnectStream = useQrStore((state) => state.disconnectStream)

  useEffect(() => {
    void loadScans(uuid)
    connectStream(uuid)

    return () => {
      disconnectStream()
    }
  }, [uuid, connectStream, disconnectStream, loadScans])

  return (
    <section className="card">
      <h2>QR Detail</h2>
      <p>
        Showing scan history for <code>{uuid}</code>.
      </p>
      <p>{status}</p>
      <p>
        Live updates: {streamConnected ? 'connected' : 'disconnected'}
        {detailLoading ? ' (loading...)' : ''}
      </p>

      {events.length > 0 ? (
        <div className="list-wrap">
          <table className="scan-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Colo</th>
                <th>Location status</th>
                <th>User location</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.eventId}>
                  <td>{new Date(event.scannedAt).toLocaleString()}</td>
                  <td>{event.colo ?? 'n/a'}</td>
                  <td>{event.locationStatus}</td>
                  <td>
                    {event.userLocation
                      ? `${event.userLocation.lat.toFixed(5)}, ${event.userLocation.lng.toFixed(5)} (±${Math.round(event.userLocation.accuracyMeters)}m)`
                      : 'not provided'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="actions">
        <button
          type="button"
          onClick={() => {
            void loadScans(uuid)
          }}
        >
          Refresh
        </button>
        <Link href={`/q/${uuid}`}>Open scan landing page</Link>
      </div>
    </section>
  )
}
