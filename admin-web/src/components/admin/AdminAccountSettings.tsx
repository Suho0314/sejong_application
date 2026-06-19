import { CSSProperties, FormEvent, useState } from 'react';
import { changeAdminId, changeAdminPassword, getAdminAccount } from '../../lib/auth';

type Message = {
  tone: 'success' | 'error';
  text: string;
};

const messageStyles: Record<Message['tone'], CSSProperties> = {
  success: {
    color: '#166534',
    fontSize: 13,
    fontWeight: 800,
    margin: '10px 0 0',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: 800,
    margin: '10px 0 0',
  },
};

export function AdminAccountSettings() {
  const [account, setAccount] = useState(getAdminAccount());
  const [nextId, setNextId] = useState(account.id);
  const [idPassword, setIdPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idMessage, setIdMessage] = useState<Message | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<Message | null>(null);

  const handleChangeId = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = changeAdminId(nextId, idPassword);

    setIdMessage({ tone: result.ok ? 'success' : 'error', text: result.message });

    if (result.ok) {
      const updatedAccount = getAdminAccount();
      setAccount(updatedAccount);
      setNextId(updatedAccount.id);
      setIdPassword('');
    }
  };

  const handleChangePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = changeAdminPassword(currentPassword, nextPassword, confirmPassword);

    setPasswordMessage({ tone: result.ok ? 'success' : 'error', text: result.message });

    if (result.ok) {
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h2>계정 정보</h2>
          <p>관리자 ID와 비밀번호를 변경합니다.</p>
        </div>
        <span className="today-label">현재 ID: {account.id}</span>
      </div>

      <div className="dashboard-grid" style={{ padding: 20 }}>
        <form className="cohort-form" onSubmit={handleChangeId}>
          <div>
            <h3>ID 변경</h3>
            <p className="table-subtitle">현재 비밀번호가 맞을 때만 ID를 변경할 수 있습니다.</p>
          </div>
          <label>
            <span>새 ID</span>
            <input value={nextId} onChange={(event) => setNextId(event.target.value)} required />
          </label>
          <label>
            <span>현재 비밀번호</span>
            <input
              value={idPassword}
              onChange={(event) => setIdPassword(event.target.value)}
              required
              type="password"
            />
          </label>
          {idMessage ? <p style={messageStyles[idMessage.tone]}>{idMessage.text}</p> : null}
          <button className="primary-button" type="submit">
            ID 변경
          </button>
        </form>

        <form className="cohort-form" onSubmit={handleChangePassword}>
          <div>
            <h3>비밀번호 변경</h3>
            <p className="table-subtitle">새 비밀번호와 확인 값이 일치해야 합니다.</p>
          </div>
          <label>
            <span>현재 비밀번호</span>
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
            />
          </label>
          <label>
            <span>새 비밀번호</span>
            <input
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              required
              type="password"
            />
          </label>
          <label>
            <span>새 비밀번호 확인</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
            />
          </label>
          {passwordMessage ? <p style={messageStyles[passwordMessage.tone]}>{passwordMessage.text}</p> : null}
          <button className="primary-button" type="submit">
            비밀번호 변경
          </button>
        </form>
      </div>
    </section>
  );
}
