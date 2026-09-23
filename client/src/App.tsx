import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { Home } from './pages/Home';
import { RoomView } from './pages/RoomView';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
          <div className="flex-1 flex flex-col z-10 w-full">
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
