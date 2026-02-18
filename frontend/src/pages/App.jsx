import { Outlet } from "react-router-dom";
import Header from "../components/Header";

const App = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default App;
