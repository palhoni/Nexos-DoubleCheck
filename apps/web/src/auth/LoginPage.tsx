import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/design-system';
import { useAuthStore } from './auth.store';
import { login } from './auth.api';
import './login.css';

function RenaultDiamond({ size = 42, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 44 56"
      fill="none"
      aria-hidden="true"
    >
      <path d="M22 2 41 28 22 54 3 28 22 2Z" stroke="currentColor" strokeWidth="4" />
      <path d="m22 8 10 20-10 20-10-20L22 8Z" stroke="currentColor" strokeWidth="3" />
      <path d="m3 28 9 0M32 28h9" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed && <path d="m4 4 16 16" />}
    </svg>
  );
}

function ConceptIcon({ children }: { children: ReactNode }) {
  return (
    <span className="nexo-concept-icon">
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

function ConceptGraph() {
  return (
    <div className="nexo-concept-graph" aria-label="Necessidades, conhecimento, impacto e decisões conectados pelo Nexo">
      <svg className="nexo-graph-lines" viewBox="0 0 520 260" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="260" cy="132" rx="214" ry="111" />
        <ellipse cx="260" cy="132" rx="166" ry="88" />
        <path d="M86 62 260 31l175 41 13 130-190 31L78 196 86 62Z" />
        <path d="M86 62 258 233 435 72 78 196l370 6L86 62Z" />
        <circle cx="260" cy="31" r="4" />
        <circle cx="160" cy="66" r="4" />
        <circle cx="348" cy="66" r="4" />
        <circle cx="145" cy="174" r="4" />
        <circle cx="359" cy="175" r="4" />
        <circle cx="258" cy="233" r="4" />
      </svg>

      <div className="nexo-concept nexo-concept--need">
        <span>Necessidades</span>
        <ConceptIcon><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" /></ConceptIcon>
      </div>
      <div className="nexo-concept nexo-concept--knowledge">
        <ConceptIcon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></ConceptIcon>
        <span>Conhecimento</span>
      </div>
      <div className="nexo-concept nexo-concept--impact">
        <span>Impacto</span>
        <ConceptIcon><path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" /></ConceptIcon>
      </div>
      <div className="nexo-concept nexo-concept--decision">
        <ConceptIcon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4" /></ConceptIcon>
        <span>Decisões</span>
      </div>
      <RenaultDiamond size={66} className="nexo-graph-mark" />
    </div>
  );
}

function HeroPanel() {
  return (
    <section className="nexo-login-hero">
      <div className="nexo-brand">
        <RenaultDiamond size={48} />
        <span>Nexo</span>
      </div>

      <div className="nexo-hero-copy">
        <h1>Conectando necessidades,<br />conhecimento e <em>decisões</em></h1>
        <p>A plataforma de inovação interna da Renault que integra inteligência de produtos, impacto e agentes de QA para acelerar soluções com confiança.</p>
      </div>

      <ConceptGraph />

      <div className="nexo-renault-signature" aria-label="Renault, we drive innovation for people">
        <strong>RENAULT</strong>
        <i />
        <span>we drive innovation<br />for people</span>
      </div>
    </section>
  );
}

function TrustItem({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <button type="button" className="nexo-trust-item">
      <span className="nexo-trust-icon">{icon}</span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="nexo-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function ServicesPanel() {
  return (
    <aside className="nexo-services" aria-label="Serviços corporativos">
      <header><strong>Serviços corporativos</strong><span><i />Todos os sistemas operacionais</span></header>
      <div className="nexo-service-grid">
        <div><b className="service-icon service-icon--jira">◆</b><span><strong>Jira</strong><small>Acompanhe tarefas</small></span></div>
        <div><b className="service-icon service-icon--confluence">✦</b><span><strong>Confluence</strong><small>Documentação</small></span></div>
        <div><b className="service-icon service-icon--agents">▣</b><span><strong>Agents</strong><small>Automação e QA</small></span></div>
        <div><b className="service-icon service-icon--knowledge">◈</b><span><strong>Knowledge Base</strong><small>Base de conhecimento</small></span></div>
      </div>
    </aside>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.accessToken, data.usuario);
      const destination = data.usuario.email.trim().toLowerCase() === 'agent_ia@teste.com' ? '/agents' : '/';
      navigate(destination, { replace: true });
    },
  });

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!email.trim() || !senha) return;
    mutation.mutate({ email: email.trim(), senha });
  }

  const errorMessage = isAxiosError(mutation.error)
    ? mutation.error.response?.data?.message ?? 'Usuário ou senha inválidos.'
    : mutation.isError
      ? 'Não foi possível conectar ao servidor.'
      : null;

  return (
    <main className="nexo-login-root">
      <HeroPanel />

      <section className="nexo-login-content">
        <div className="nexo-mobile-brand"><RenaultDiamond size={35} /><strong>Nexo</strong></div>

        <form className="nexo-login-card" onSubmit={handleSubmit}>
          <header className="nexo-card-heading">
            <h2>Entrar no Nexo</h2>
            <p>Acesse com sua conta corporativa Renault.</p>
          </header>

          <button type="button" className="nexo-corporate-button" onClick={() => document.getElementById('corporate-email')?.focus()}>
            <RenaultDiamond size={24} />
            Entrar com conta corporativa
          </button>

          <div className="nexo-divider"><span>ou</span></div>

          {errorMessage && <Alert type="error">{errorMessage}</Alert>}

          <label className="nexo-field">
            <span>E-mail corporativo</span>
            <input id="corporate-email" type="email" autoComplete="username" placeholder="seu.nome@renault.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={mutation.isError} />
          </label>

          <label className="nexo-field">
            <span>Senha</span>
            <span className="nexo-password-wrap">
              <input type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha corporativa" value={senha} onChange={(event) => setSenha(event.target.value)} aria-invalid={mutation.isError} />
              <button type="button" onClick={() => setShowPass((visible) => !visible)} aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}><EyeIcon crossed={showPass} /></button>
            </span>
          </label>

          <div className="nexo-login-options">
            <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Manter conectado neste dispositivo</span></label>
            <button type="button">Esqueceu sua senha?</button>
          </div>

          <button className="nexo-submit" type="submit" disabled={mutation.isPending || !email.trim() || !senha}>
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="nexo-trust-list">
            <TrustItem
              title="Protegido por Okta Verify"
              description="Verifique sua identidade com o app Okta Verify."
              icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>}
            />
            <TrustItem
              title="Precisa de ajuda? Use o Copilot corporativo"
              description="Obtenha suporte e respostas rápidas dos nossos agentes."
              icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3a4 4 0 0 0-4 4v2a3 3 0 0 0 0 6v2a4 4 0 0 0 4 4M16 3a4 4 0 0 1 4 4v2a3 3 0 0 1 0 6v2a4 4 0 0 1-4 4M8 3v18M16 3v18M8 8h3M13 16h3" /></svg>}
            />
          </div>
        </form>

        <ServicesPanel />
      </section>

      <footer className="nexo-login-footer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        Uso interno Renault
      </footer>
    </main>
  );
}
