import React, { useState } from 'react';
import { ArrowLeft, Mail, LockKeyhole, Eye, EyeOff, Handshake } from 'lucide-react';
import { authEnabled, authRequest } from './api';

export default function AuthScreen({ onBack, onAuthenticated, onGuest }) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (pending || !authEnabled) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const { user } = await authRequest(register ? 'register' : 'login', {
        email: fields.get('email'), password: fields.get('password'),
        ...(register ? { name: fields.get('name') } : {}),
      });
      onAuthenticated(user);
    } catch (failure) {
      setError(failure instanceof TypeError ? 'Não foi possível conectar. Confira sua conexão e tente novamente.' : failure.message);
    } finally { setPending(false); }
  }
  return <main className="screen auth">
    <header className="simpleHeader"><button aria-label="Voltar" onClick={onBack}><ArrowLeft/></button></header>
    <div className="logo"><div className="logoMark"><Handshake size={30}/></div><span>Coop<b>Serve</b></span></div>
    <h1>{register ? 'Crie sua conta' : 'Bem-vindo(a) de volta!'}</h1>
    <p>{register ? 'Cadastre-se para acessar sua conta CoopServe.' : 'Acesse sua conta para continuar.'}</p>
    {!authEnabled && <p className="authNotice" role="status">Esta é a demonstração do CoopServe. O cadastro e o login reais serão disponibilizados no endereço da aplicação integrada.</p>}
    <form onSubmit={submit}>
      {register && <label className="field"><input aria-label="Nome completo" name="name" placeholder="Nome completo" autoComplete="name" minLength={2} maxLength={100} required disabled={!authEnabled || pending}/></label>}
      <label className="field"><Mail/><input aria-label="E-mail" name="email" type="email" placeholder="E-mail" autoComplete="email" maxLength={254} required disabled={!authEnabled || pending}/></label>
      <label className="field"><LockKeyhole/><input aria-label="Senha" name="password" type={showPassword ? 'text' : 'password'} placeholder="Senha" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 15 : 1} maxLength={128} required disabled={!authEnabled || pending}/><button type="button" className="passwordToggle" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff/> : <Eye/>}</button></label>
      {register && <p className="passwordHint">Use uma frase-senha com pelo menos 15 caracteres. Não reutilize senhas de outros serviços.</p>}
      {error && <p className="authError" role="alert">{error}</p>}
      <button className="primary" disabled={!authEnabled || pending}>{pending ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
    </form>
    <div className="divider">ou</div>
    <button className="outline" onClick={onGuest} disabled={pending}>Explorar como visitante</button>
    <p className="signup">{register ? 'Já tem conta?' : 'Ainda não tem conta?'} <button className="textButton" disabled={pending} onClick={() => { setRegister(value => !value); setError(''); }}>{register ? 'Entrar' : 'Cadastre-se'}</button></p>
    <p className="passwordHint">Recuperação de senha e confirmação de e-mail ainda não estão disponíveis nesta primeira etapa.</p>
  </main>;
}
