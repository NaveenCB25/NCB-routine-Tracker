import React, { useState } from 'react';

// Common CSS Properties
const sCont = {
  background: "#13132b",
  border: "1px solid #1e1e3e",
  borderRadius: 16,
  padding: 40,
  width: "100%",
  maxWidth: 400,
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
  margin: "0 auto",
  marginTop: "10vh",
  color: "#eeeef8"
};

const sInput = {
  width: "100%",
  background: "#0a0a1e",
  border: "1.5px solid #1e1e3e",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  marginBottom: 20,
  marginTop: 8
};

const sLabel = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#c0c0e0",
};

const sBtn = {
  width: "100%",
  background: "#6C63FF",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
  marginTop: 10
};

const sMsgErr = { background: "rgba(239, 71, 111, 0.15)", color: "#EF476F", border: "1px solid rgba(239, 71, 111, 0.3)", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: "center", marginBottom: 16 };
const sMsgSucc = { background: "rgba(6, 214, 160, 0.15)", color: "#06D6A0", border: "1px solid rgba(6, 214, 160, 0.3)", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: "center", marginBottom: 16 };

const API_URL = 'http://localhost:5000/api/auth';

interface AuthProps {
  onLogin: (token: string, user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({ text: data.message || 'Authentication failed', isError: true });
      } else {
        setMsg({ text: data.message || 'Success!', isError: false });
        if (isLogin) {
          // Pass token up to parent RoutineTracker
          onLogin(data.token, data.user);
        } else {
          // Switch to login
          setTimeout(() => setIsLogin(true), 1500);
        }
      }
    } catch (err) {
      setMsg({ text: 'Server connection error.', isError: true });
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "linear-gradient(160deg, #08081a 0%, #0e0e22 60%, #0a0a1e 100%)", fontFamily: "'Inter', sans-serif" }}>
      <div style={sCont} className="rt-fade">
        <h2 style={{ fontSize: 26, fontWeight: 800, textAlign: "center", color: "#6C63FF", marginBottom: 8, marginTop: 0 }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p style={{ textAlign: "center", color: "#9090b8", fontSize: 14, marginBottom: 30 }}>
          {isLogin ? "Log in to continue to your Routine Tracker" : "Join NCB Tracker and start building habits"}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label style={sLabel}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter your name" style={sInput} />
            </div>
          )}
          
          <div>
            <label style={sLabel}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your email" style={sInput} />
          </div>
          
          <div>
             <label style={sLabel}>Password</label>
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" style={sInput} />
          </div>

          {msg.text && (
            <div style={(msg.isError ? sMsgErr : sMsgSucc) as React.CSSProperties}>
              {msg.text}
            </div>
          )}

          <button type="submit" style={sBtn}>
            {isLogin ? "Log In" : "Register"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#9090b8" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ color: "#6C63FF", fontWeight: 600, cursor: "pointer" }}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            {isLogin ? "Register here" : "Log in here"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;
