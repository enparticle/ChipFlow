import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ParticleCanvas from './components/ParticleCanvas'
import Sidebar from './components/Sidebar'
import ExperimentPage from './pages/ExperimentPage'
import InversePage from './pages/InversePage'
import CalibrationPage from './pages/CalibrationPage'
import LandscapePage from './pages/LandscapePage'
import { api } from './lib/client'
import './index.css'

export default function App() {
  const [chips, setChips]       = useState([])
  const [currentChip, setChip]  = useState(null)
  const [branch, setBranch]     = useState('EW')

  const loadChips = useCallback(async () => {
    try {
      const data = await api.get('/chips')
      setChips(data)
      if (data.length && !currentChip) setChip(data[0])
    } catch (e) {
      console.error('chip load failed:', e.message)
    }
  }, [currentChip])

  useEffect(() => { loadChips() }, [])

  return (
    <BrowserRouter>
      <div className="shell">
        <ParticleCanvas />
        <Sidebar
          chips={chips}
          currentChip={currentChip}
          onSelectChip={setChip}
          onRefresh={loadChips}
        />
        <div className="main">
          <Routes>
            <Route path="/"            element={<ExperimentPage  chip={currentChip} branch={branch} onBranch={setBranch}/>}/>
            <Route path="/inverse"     element={<InversePage     chip={currentChip} branch={branch} onBranch={setBranch}/>}/>
            <Route path="/calibration" element={<CalibrationPage chip={currentChip} onChipUpdate={loadChips}/>}/>
            <Route path="/landscape"   element={<LandscapePage   chip={currentChip}/>}/>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
