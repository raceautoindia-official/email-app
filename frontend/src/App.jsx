import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
// import LoginPage from './components/LoginPage';
// import EmailListPage from './components/EmailListPage';
import ComposeEmailPage from './components/ComposeEmailPage';
import Header from './components/Header';

function App() {
  return (
    <div>
      <Router>
      <Header />
        <Routes>
          {/* <Route path="/" element={<LoginPage />} /> */}
          {/* <Route path="/emails" element={<EmailListPage />} /> */}
          <Route path="/" element={<ComposeEmailPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;

