import { LOGO_URL } from '@/lib/constants'
import './App.css'

export default function App() {
  return (
    <div className="sidepanel-branding">
      <div className="sidepanel-branding-icon">
        <img src={LOGO_URL} alt="" className="icon" />
      </div>
      <h1 className="sidepanel-branding-title">LinkArena</h1>
    </div>
  )
}
