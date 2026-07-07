import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  changeTeacherPassword,
  getTeacherAccount,
  TeacherAccount,
  updateTeacherAccount,
} from '../../api/account';

type Message = {
  tone: 'success' | 'error';
  text: string;
};

type AccountFormValues = {
  loginId: string;
  name: string;
  email: string;
  phone: string;
};

const emptyAccountForm: AccountFormValues = {
  loginId: '',
  name: '',
  email: '',
  phone: '',
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

const toAccountFormValues = (account: TeacherAccount): AccountFormValues => ({
  loginId: account.loginId,
  name: account.name,
  email: account.email ?? '',
  phone: account.phone ?? '',
});

const normalizeOptionalValue = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';

export function AdminAccountSettings() {
  const [account, setAccount] = useState<TeacherAccount | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormValues>(emptyAccountForm);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [accountMessage, setAccountMessage] = useState<Message | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<Message | null>(null);

  const accountChanged = useMemo(() => {
    if (!account) return false;

    const initialValues = toAccountFormValues(account);
    return (
      accountForm.loginId !== initialValues.loginId ||
      accountForm.name !== initialValues.name ||
      accountForm.email !== initialValues.email ||
      accountForm.phone !== initialValues.phone
    );
  }, [account, accountForm]);

  const loadAccount = async () => {
    setIsLoading(true);
    setAccountMessage(null);

    try {
      const latestAccount = await getTeacherAccount();
      setAccount(latestAccount);
      setAccountForm(toAccountFormValues(latestAccount));
    } catch (error) {
      setAccountMessage({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const handleAccountFieldChange = (field: keyof AccountFormValues, value: string) => {
    setAccountForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accountChanged || isSavingAccount) return;

    setIsSavingAccount(true);
    setAccountMessage(null);

    try {
      const updatedAccount = await updateTeacherAccount({
        loginId: accountForm.loginId.trim(),
        name: accountForm.name.trim(),
        email: normalizeOptionalValue(accountForm.email),
        phone: normalizeOptionalValue(accountForm.phone),
      });
      setAccount(updatedAccount);
      setAccountForm(toAccountFormValues(updatedAccount));
      setAccountMessage({ tone: 'success', text: '계정 정보가 저장되었습니다.' });
    } catch (error) {
      setAccountMessage({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isChangingPassword) return;

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      await changeTeacherPassword({
        currentPassword,
        nextPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setPasswordMessage({ tone: 'success', text: '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.' });
    } catch (error) {
      setPasswordMessage({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h2>계정 정보</h2>
          <p>현재 로그인한 강사 계정 정보를 수정합니다.</p>
        </div>
        <span className="today-label">현재 ID: {account?.loginId ?? '-'}</span>
      </div>

      {isLoading ? (
        <div className="empty-state">계정 정보를 불러오는 중입니다.</div>
      ) : null}

      {!isLoading && !account ? (
        <div className="empty-state">
          <p>계정 정보를 불러오지 못했습니다.</p>
          <button className="secondary-button" type="button" onClick={() => void loadAccount()}>
            다시 조회
          </button>
        </div>
      ) : null}

      {account ? (
        <div className="dashboard-grid" style={{ padding: 20 }}>
          <form className="cohort-form" onSubmit={handleSaveAccount}>
            <div>
              <h3>기본 정보</h3>
              <p className="table-subtitle">이름, ID, 이메일, 연락처를 실제 계정 정보에 저장합니다.</p>
            </div>
            <label>
              <span>이름</span>
              <input
                value={accountForm.name}
                onChange={(event) => handleAccountFieldChange('name', event.target.value)}
                required
              />
            </label>
            <label>
              <span>ID</span>
              <input
                value={accountForm.loginId}
                onChange={(event) => handleAccountFieldChange('loginId', event.target.value)}
                required
              />
            </label>
            <label>
              <span>이메일</span>
              <input
                value={accountForm.email}
                onChange={(event) => handleAccountFieldChange('email', event.target.value)}
                type="email"
              />
            </label>
            <label>
              <span>연락처</span>
              <input
                value={accountForm.phone}
                onChange={(event) => handleAccountFieldChange('phone', event.target.value)}
              />
            </label>
            {accountMessage ? <p style={messageStyles[accountMessage.tone]}>{accountMessage.text}</p> : null}
            <button className="primary-button" disabled={!accountChanged || isSavingAccount} type="submit">
              {isSavingAccount ? '저장 중...' : '계정 정보 저장'}
            </button>
          </form>

          <form className="cohort-form" onSubmit={handleChangePassword}>
            <div>
              <h3>비밀번호 변경</h3>
              <p className="table-subtitle">현재 비밀번호 확인 후 8자 이상의 새 비밀번호로 변경합니다.</p>
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
                minLength={8}
                type="password"
              />
            </label>
            <label>
              <span>새 비밀번호 확인</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                type="password"
              />
            </label>
            {passwordMessage ? <p style={messageStyles[passwordMessage.tone]}>{passwordMessage.text}</p> : null}
            <button className="primary-button" disabled={isChangingPassword} type="submit">
              {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
