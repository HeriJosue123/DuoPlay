import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { Home } from './pages/Home';
import { RoomView } from './pages/RoomView';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
          {/* Subtle neon accents behind the content */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-600/5 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="flex-1 flex flex-col z-10 w-full max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/room/:id" element={<RoomView />} />
            </Routes>
          </div>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
