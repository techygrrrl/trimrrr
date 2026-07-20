import VideoEditor from './components/VideoEditor'

function App() {
  return (
    <div className="py-6">
      <p className="text-center text-sm font-medium text-dark-100/80 dark:text-white/70">
        Pick a video to trim and compress
      </p>

      <VideoEditor />
    </div>
  )
}

export default App
