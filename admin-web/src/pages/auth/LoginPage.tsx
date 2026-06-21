import { CSSProperties, FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { adminAccount } from '../../mock/adminAccount';
import { findAdminId, findAdminPassword, isAdminAuthenticated, loginAdmin } from '../../lib/auth';

type FindMode = 'id' | 'password';

const loginPageStyle: CSSProperties = {
  alignItems: 'center',
  background: '#f3f4f6',
  display: 'flex',
  minHeight: '100vh',
  padding: 24,
};

const loginPanelStyle: CSSProperties = {
  margin: '0 auto',
  maxWidth: 440,
  width: '100%',
};

const modalBackdropStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(15, 23, 42, 0.36)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: 24,
  position: 'fixed',
  zIndex: 20,
};

const helperTextStyle: CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  margin: '8px 0 0',
};

const errorTextStyle: CSSProperties = {
  color: '#b91c1c',
  fontSize: 13,
  fontWeight: 700,
  margin: '10px 0 0',
};

const resultTextStyle: CSSProperties = {
  color: '#166534',
  fontSize: 14,
  fontWeight: 800,
  margin: '10px 0 0',
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectState = location.state as { from?: string } | null;
  const redirectTo = redirectState?.from ?? '/admin/dashboard';
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [findMode, setFindMode] = useState<FindMode | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [findError, setFindError] = useState('');
  const [findResult, setFindResult] = useState('');

  if (isAdminAuthenticated()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const openFindModal = (mode: FindMode) => {
    setFindMode(mode);
    setSecurityAnswer('');
    setFindError('');
    setFindResult('');
  };

  const closeFindModal = () => {
    setFindMode(null);
    setSecurityAnswer('');
    setFindError('');
    setFindResult('');
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await loginAdmin(id, password);
      navigate(redirectTo, { replace: true });
    } catch {
      setLoginError('ID 또는 Password가 올바르지 않습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFindAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!findMode) return;

    const result = findMode === 'id' ? findAdminId(securityAnswer) : findAdminPassword(securityAnswer);

    if (!result) {
      setFindResult('');
      setFindError('보안 질문 답변이 일치하지 않습니다.');
      return;
    }

    setFindError('');
    setFindResult(findMode === 'id' ? `관리자 ID는 ${result} 입니다.` : `관리자 Password는 ${result} 입니다.`);
  };

  return (
    <div style={loginPageStyle}>
      <section className="dashboard-panel" style={loginPanelStyle}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Admin Login</p>
            <h2>강사용 웹 로그인</h2>
            <p>관리자 계정으로 로그인하세요.</p>
          </div>
        </div>

        <form className="cohort-form" onSubmit={handleLogin}>
          <label>
            <span>ID 또는 Email</span>
            <input value={id} onChange={(event) => setId(event.target.value)} placeholder="teacher1" required />
          </label>
          <label>
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="teacher-1234"
              required
              type="password"
            />
          </label>
          {loginError ? <p style={errorTextStyle}>{loginError}</p> : null}
          <button className="primary-button" disabled={isLoggingIn} type="submit">
            {isLoggingIn ? '로그인 중...' : '로그인'}
          </button>
          <div className="form-actions">
            <button className="text-button" type="button" onClick={() => openFindModal('id')}>
              ID 찾기
            </button>
            <button className="text-button" type="button" onClick={() => openFindModal('password')}>
              비밀번호 찾기
            </button>
          </div>
        </form>
      </section>

      {findMode ? (
        <div aria-modal="true" role="dialog" style={modalBackdropStyle}>
          <section className="dashboard-panel" style={loginPanelStyle}>
            <div className="panel-header">
              <div>
                <h2>{findMode === 'id' ? 'ID 찾기' : '비밀번호 찾기'}</h2>
                <p>사전에 설정된 보안 질문에 답변하세요.</p>
              </div>
            </div>
            <form className="cohort-form" onSubmit={handleFindAccount}>
              <label>
                <span>보안 질문</span>
                <input readOnly value={adminAccount.securityQuestion} />
              </label>
              <label>
                <span>답변</span>
                <input
                  value={securityAnswer}
                  onChange={(event) => setSecurityAnswer(event.target.value)}
                  placeholder="보안 질문 답변을 입력하세요."
                  required
                />
              </label>
              <p style={helperTextStyle}>핸드폰 인증과 이메일 인증은 사용하지 않습니다.</p>
              {findError ? <p style={errorTextStyle}>{findError}</p> : null}
              {findResult ? <p style={resultTextStyle}>{findResult}</p> : null}
              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeFindModal}>
                  닫기
                </button>
                <button className="primary-button" type="submit">
                  확인
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
