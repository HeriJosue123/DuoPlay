
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { Home } from './pages/Home';
import { RoomView } from './pages/RoomView';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-slate-50 font-sans flex flex-col relative overflow-hidden">
          {/* Ambient background decoration */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="flex-1 flex flex-col z-10">
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
