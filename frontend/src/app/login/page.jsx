// src/app/login/page.js
import "./styles.css";
export default function LoginPage() {
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Accedi</h1>
          <p>Inserisci le tue credenziali per accedere</p>
        </div>
        
        <form className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Inserisci la tua email"
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Inserisci la tua password"
              required 
            />
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="remember" name="remember" />
              <label htmlFor="remember">Ricordami</label>
            </div>
            <a href="#" className="forgot-password">Password dimenticata?</a>
          </div>
          
          <button type="submit" className="login-button">Accedi</button>
        </form>
        
        <div className="login-footer">
          <p>Non hai un account? <a href="/register">Registrati</a></p>
        </div>
      </div>
    </div>
  );
}