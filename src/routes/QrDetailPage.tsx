import { useEffect } from 'react'
import { Link } from 'wouter'
import { useQrStore } from '../store/qrStore'

type QrDetailPageProps = {
  uuid: string
}

export function QrDetailPage({ uuid }: QrDetailPageProps) {
  const profile = useQrStore((state) => state.detailProfile)
  const events = useQrStore((state) => state.detailEvents)
  const status = useQrStore((state) => state.detailStatus)
  const detailLoading = useQrStore((state) => state.detailLoading)
  const streamConnected = useQrStore((state) => state.streamConnected)

  const loadDetail = useQrStore((state) => state.loadDetail)
  const refreshDetailEvents = useQrStore((state) => state.refreshDetailEvents)
  const connectDetailStream = useQrStore((state) => state.connectDetailStream)
  const disconnectDetailStream = useQrStore((state) => state.disconnectDetailStream)

  useEffect(() => {
    void loadDetail(uuid)
    connectDetailStream(uuid)

    return () => {
      disconnectDetailStream()
    }
  }, [uuid, loadDetail, connectDetailStream, disconnectDetailStream])

  return (
    <section className="card">
      <h2>QR Detail</h2>
      <p>
        Showing interaction history for <code>{uuid}</code>.
      </p>
      {profile ? (
        <p>
          Created by <strong>{profile.name}</strong> about{' '}
          <strong>{profile.topic}</strong>.
        </p>
      ) : null}
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
                <th>Accepted</th>
                <th>Method</th>
                <th>Distance</th>
                <th>Reason</th>
                <th>Scanner status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.eventId}>
                  <td>{new Date(event.attemptedAt).toLocaleString()}</td>
                  <td>{event.accepted ? 'yes' : 'no'}</td>
                  <td>{event.decisionMethod}</td>
                  <td>
                    {event.distanceMeters != null
                      ? `${Math.round(event.distanceMeters)}m`
                      : 'n/a'}
                  </td>
                  <td>{event.reason ?? 'n/a'}</td>
                  <td>{event.scannerLocationStatus}</td>
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
            void refreshDetailEvents(uuid)
          }}
        >
          Refresh
        </button>
        <Link href={`/q/${uuid}`}>Open scan page</Link>
      </div>
    </section>
  )
}
