import { slides } from './slides'

export default function App() {
  return (
    <div className="min-h-screen bg-white p-10">
      <div id="slides-root" className="flex flex-col items-center gap-10">
        {slides.map((Slide, index) => (
          <Slide key={index} />
        ))}
      </div>
    </div>
  )
}
