import { useNavigate } from 'react-router-dom';

function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f6f1ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>

        <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
        <h1 style={{ margin: '0 0 12px', color: '#1f2937' }}>Thank You for Your Donation!</h1>
        <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
          Your generosity helps provide safety, care, and opportunity to those who need it most.
        </p>

        <div style={{ background: '#f6f1ee', borderRadius: 12, padding: '20px 24px', textAlign: 'left', marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', color: '#1f2937' }}>Your Impact</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 2 }}>
            <li>🏠 Supports safe housing for children in need</li>
            <li>📚 Provides education and wellbeing resources</li>
            <li>💛 Helps transform and restore lives</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'linear-gradient(135deg, #e89b7a, #d97757)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Back to Home
          </button>
          <button
            onClick={() => navigate('/donate')}
            style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Donate Again
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#9ca3af' }}>Hearth Haven is a registered nonprofit. Your contribution makes a difference.</p>
      </div>
    </div>
  );
}

export default ThankYouPage;
