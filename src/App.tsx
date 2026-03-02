import { Link, Route, Switch } from 'wouter'
import './App.css'
import { CreateQrPage } from './routes/CreateQrPage'
import { ScanPage } from './routes/ScanPage'
import { QrDetailPage } from './routes/QrDetailPage'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>QR Scan Location PoC</h1>
        <p>Phase 1: route skeleton and flow preview.</p>
        <nav>
          <Link href="/">Create QR</Link>
        </nav>
      </header>

      <Switch>
        <Route path="/" component={CreateQrPage} />
        <Route path="/q/:uuid">
          {(params) => <ScanPage uuid={params.uuid} />}
        </Route>
        <Route path="/qr/:uuid">
          {(params) => <QrDetailPage uuid={params.uuid} />}
        </Route>
        <Route>
          <section className="card">
            <h2>Page not found</h2>
            <p>The route does not exist yet.</p>
            <Link href="/">Go back</Link>
          </section>
        </Route>
      </Switch>
    </main>
  )
}

export default App
