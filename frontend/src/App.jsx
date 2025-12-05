import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { NotesProvider } from "./context/NotesContext";
import CreateNote from "./pages/CreateNote";
import NoteEditor from "./pages/NotesEditor";
import "./App.css";


function App() {
  return (
    <NotesProvider>
      <BrowserRouter>
        <header className="header">
          <div className="header-content">
            <h1>
              <Link to="/" className="logo-link">
                📝 Collaborative Notes
              </Link>
            </h1>
            <nav>
              <Link to="/" className="nav-link">
                Create Note
              </Link>
            </nav>
          </div>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CreateNote />} />
            <Route path="/note/:id" element={<NoteEditor />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <p>Real-time Collaborative Notes App • Built with MERN & Socket.IO</p>
        </footer>
      </BrowserRouter>
    </NotesProvider>
  );
}

export default App;